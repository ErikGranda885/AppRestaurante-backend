import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { Venta } from './venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { Usuario } from 'src/usuarios/usuario.entity';
import { Det_Venta } from 'src/dets_ventas/det_venta.entity';
import { CierreDiaService } from 'src/cierre_dia/cierre_dia.service';
import { format, getWeek, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { Buffer } from 'buffer';
import * as PdfPrinter from 'pdfmake';
@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private ventaRepository: Repository<Venta>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Det_Venta)
    private detVentaRepository: Repository<Det_Venta>,
    private readonly cierreDiaService: CierreDiaService,
    private dataSource: DataSource,
  ) {}

  // Crea una nueva venta
  async crearVenta(
    createVentaDto: CreateVentaDto,
  ): Promise<{ message: string; venta: Venta }> {
    const {
      usu_vent,
      efe_recibido_vent,
      efe_cambio_vent,
      tot_vent,
      fech_vent,
      est_vent,
      tip_pag_vent,
      comprobante_num_vent,
      comprobante_img_vent,
    } = createVentaDto;

    const usuario = await this.usuarioRepository.findOne({
      where: { id_usu: usu_vent },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${usu_vent} no encontrado`);
    }

    if (tip_pag_vent === 'transferencia') {
      if (!comprobante_num_vent || !comprobante_img_vent) {
        throw new BadRequestException(
          'Para pagos por transferencia se requiere número e imagen del comprobante.',
        );
      }
    }

    if (tip_pag_vent === 'efectivo') {
      if (efe_recibido_vent === null || efe_recibido_vent === undefined) {
        throw new BadRequestException('Debes ingresar el monto recibido.');
      }

      if (efe_recibido_vent < tot_vent) {
        throw new BadRequestException(
          `El monto recibido ($${efe_recibido_vent}) no puede ser menor al total de la venta ($${tot_vent}).`,
        );
      }
    }

    // 🛡️ VALIDACIÓN DE CIERRE
    const fechaVenta = new Date(fech_vent).toISOString().split('T')[0];

    const diaCerrado = await this.cierreDiaService.esDiaCerrado(fechaVenta);
    if (diaCerrado) {
      throw new BadRequestException(
        `No se pueden registrar ventas en un día cerrado (${fechaVenta}).`,
      );
    }

    const venta = new Venta();
    venta.usu_vent = usuario;
    venta.tot_vent = tot_vent;
    venta.fech_vent = fech_vent;
    venta.est_vent =
      tip_pag_vent === 'transferencia' ? 'Por validar' : 'Sin cerrar';
    venta.tip_pag_vent = tip_pag_vent;

    if (tip_pag_vent === 'transferencia') {
      venta.comprobante_num_vent = comprobante_num_vent || null;
      venta.comprobante_img_vent = comprobante_img_vent || null;
    }

    if (tip_pag_vent === 'efectivo') {
      venta.efe_recibido_vent = efe_recibido_vent ?? 0;
      venta.efe_cambio_vent = efe_cambio_vent ?? 0;
    }

    const ventaGuardada = await this.ventaRepository.save(venta);

    // ✅ ACTUALIZAR RESUMEN DEL CIERRE
    await this.cierreDiaService.verificarOCrearCierreSiNoExiste(fechaVenta);
    await this.cierreDiaService.actualizarResumenDelDia(fechaVenta);

    return {
      message: 'Venta creada exitosamente',
      venta: ventaGuardada,
    };
  }

  // Lista todas las ventas
  async listarVentas(): Promise<Venta[]> {
    return this.ventaRepository.find();
  }

  // Obtiene una venta por su id
  async obtenerVenta(id: number): Promise<Venta> {
    const venta = await this.ventaRepository.findOne({
      where: { id_vent: id },
    });
    if (!venta) {
      throw new NotFoundException(`Venta con id ${id} no encontrada`);
    }
    return venta;
  }

  /* Metodo para calcular las ventas por categorias */
  async obtenerVentasPorCategoria(): Promise<
    { categoria: string; total: number }[]
  > {
    return await this.dataSource
      .getRepository(Det_Venta)
      .createQueryBuilder('detalle')
      .leftJoin('detalle.prod_dventa', 'producto')
      .leftJoin('producto.cate_prod', 'categoria')
      .select('categoria.nom_cate', 'categoria')
      .addSelect('SUM(detalle.sub_tot_dventa)', 'total')
      .groupBy('categoria.nom_cate')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  /* Metodo para Dashboard */
  async calcularTotalVentasPorFecha(fecha: string): Promise<{ total: number }> {
    const inicio = new Date(`${fecha}T00:00:00`);
    const fin = new Date(`${fecha}T23:59:59.999`);

    const ventas = await this.ventaRepository.find({
      where: {
        fech_vent: Between(inicio, fin),
        est_vent: In(['Cerrada', 'Sin cerrar']),
      },
    });

    const total = ventas.reduce(
      (acc, venta) => acc + Number(venta.tot_vent),
      0,
    );

    return { total };
  }

  // Actualiza una venta existente
  async actualizarVenta(
    id: number,
    updateVentaDto: UpdateVentaDto,
  ): Promise<{ message: string; venta: Venta }> {
    const venta = await this.obtenerVenta(id);

    // Si se actualiza el usuario asociado, validar que exista
    if (updateVentaDto.usu_vent) {
      const usuario = await this.usuarioRepository.findOne({
        where: { id_usu: updateVentaDto.usu_vent },
      });
      if (!usuario) {
        throw new NotFoundException(
          `Usuario con id ${updateVentaDto.usu_vent} no encontrado`,
        );
      }
      venta.usu_vent = usuario;
    }

    Object.assign(venta, updateVentaDto);
    const ventaActualizada = await this.ventaRepository.save(venta);
    return {
      message: 'Venta actualizada exitosamente',
      venta: ventaActualizada,
    };
  }

  /* Cambiar estado de la venta */
  async actualizarEstado(
    id: number,
    est_vent: string,
  ): Promise<{ message: string; venta: Venta }> {
    const venta = await this.obtenerVenta(id);
    venta.est_vent = est_vent;
    await this.ventaRepository.save(venta);

    const ventaActualizada = await this.ventaRepository.findOne({
      where: { id_vent: id },
      relations: ['usu_vent', 'usu_vent.rol_usu'],
    });

    if (!ventaActualizada) {
      throw new NotFoundException(
        `Venta con id ${id} no encontrada tras la actualización`,
      );
    }

    return {
      message: 'Estado de la venta actualizado exitosamente',
      venta: ventaActualizada,
    };
  }

  // Filtra ventas por estado
  async filtrarVentasPorEstado(est_vent: string): Promise<Venta[]> {
    return this.ventaRepository.find({ where: { est_vent } });
  }
  // Filtra ventas por fecha
  async filtrarVentasPorFecha(fech_vent: Date): Promise<Venta[]> {
    return this.ventaRepository.find({ where: { fech_vent } });
  }
  // Filtra ventas por usuario
  async filtrarVentasPorUsuario(usu_vent: number): Promise<Venta[]> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usu: usu_vent },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${usu_vent} no encontrado`);
    }
    return this.ventaRepository.find({ where: { usu_vent: usuario } });
  }
  async listarVentasConDetalles(): Promise<any[]> {
    const ventas = await this.ventaRepository.find({
      relations: ['usu_vent'],
      order: { fech_vent: 'DESC' },
    });

    const resultados = await Promise.all(
      ventas.map(async (venta) => {
        const detalles = await this.detVentaRepository.find({
          where: { vent_dventa: { id_vent: venta.id_vent } },
          relations: ['prod_dventa'],
        });

        const productos = detalles.map((det) => ({
          nombre: det.prod_dventa.nom_prod,
          cantidad: det.cant_dventa,
          precio: det.pre_uni_dventa,
          subtotal: det.sub_tot_dventa,
        }));

        return {
          id_venta: venta.id_vent,
          cliente: venta.usu_vent,
          tipoOrden: venta.tip_pag_vent,
          estado: venta.est_vent,
          tipoPago: venta.tip_pag_vent,
          comprobante: venta.comprobante_num_vent,
          comprobanteImg: venta.comprobante_img_vent,
          fecha: venta.fech_vent,
          efectivoRecibido: venta.efe_recibido_vent,
          efectivoCambio: venta.efe_cambio_vent,
          total: venta.tot_vent,
          productos,
        };
      }),
    );

    return resultados;
  }

  async listarVentasConDetallesPorPeriodo(
    desde?: string,
    hasta?: string,
  ): Promise<any[]> {
    const where: any = {};
    if (desde && hasta) {
      where.fech_vent = Between(new Date(desde), new Date(hasta));
    }

    const ventas = await this.ventaRepository.find({
      where,
      relations: ['usu_vent'],
      order: { fech_vent: 'ASC' },
    });

    const resultados = await Promise.all(
      ventas.map(async (venta) => {
        const detalles = await this.detVentaRepository.find({
          where: { vent_dventa: { id_vent: venta.id_vent } },
          relations: ['prod_dventa'],
        });

        const productos = detalles.map((det) => ({
          nombre: det.prod_dventa.nom_prod,
          cantidad: det.cant_dventa,
          precio: det.pre_uni_dventa,
          subtotal: det.sub_tot_dventa,
        }));

        return {
          id_venta: venta.id_vent,
          cliente: venta.usu_vent,
          tipoOrden: venta.tip_pag_vent,
          estado: venta.est_vent,
          tipoPago: venta.tip_pag_vent,
          comprobante: venta.comprobante_num_vent,
          comprobanteImg: venta.comprobante_img_vent,
          fecha: venta.fech_vent,
          efectivoRecibido: venta.efe_recibido_vent,
          efectivoCambio: venta.efe_cambio_vent,
          total: venta.tot_vent,
          productos,
        };
      }),
    );

    return resultados;
  }

  /* Obtener ventas por periodo (mensual, semanal, diario) */
  /* async obtenerVentasPorPeriodo(
    tipo: 'diario' | 'semanal' | 'mensual',
    desde?: string,
    hasta?: string,
  ): Promise<{ periodo: string; total: number }[]> {
    const where: any = {};

    if (desde && hasta) {
      where.fech_vent = Between(new Date(desde), new Date(hasta));
    }

    const ventas = await this.ventaRepository.find({
      where,
      order: { fech_vent: 'ASC' },
    });

    const agrupacion: Record<string, number> = {};

    for (const venta of ventas) {
      const fecha = new Date(venta.fech_vent);
      let clave = '';

      if (tipo === 'mensual') {
        clave = format(fecha, 'MMMM yyyy', { locale: es });
      } else if (tipo === 'semanal') {
        const semana = Math.ceil(fecha.getDate() / 7);
        clave = `Semana ${semana} - ${format(fecha, 'MMMM yyyy', { locale: es })}`;
      } else {
        clave = format(fecha, 'dd/MM/yyyy');
      }

      agrupacion[clave] = (agrupacion[clave] || 0) + Number(venta.tot_vent);
    }

    return Object.entries(agrupacion).map(([periodo, total]) => ({
      periodo,
      total: Number(total.toFixed(2)),
    }));
  } */

  async obtenerVentasPorPeriodo(
    tipo: 'diario' | 'semanal' | 'mensual',
    desde?: string,
    hasta?: string,
  ): Promise<{ periodo: string; total: number }[]> {
    const where: any = {};

    if (desde && hasta) {
      where.fech_vent = Between(new Date(desde), new Date(hasta));
    }

    const ventas = await this.ventaRepository.find({
      where,
      order: { fech_vent: 'ASC' },
    });

    const agrupacion: Record<string, number> = {};

    for (const venta of ventas) {
      const fecha = new Date(venta.fech_vent);
      let clave = '';

      if (tipo === 'mensual') {
        clave = format(fecha, 'MMMM yyyy', { locale: es });
      } else if (tipo === 'semanal') {
        const semana = getWeek(fecha, { weekStartsOn: 1, locale: es });
        const anio = getYear(fecha);
        clave = `Semana ${semana} - ${anio}`;
      } else {
        clave = format(fecha, 'dd/MM/yyyy');
      }

      agrupacion[clave] = (agrupacion[clave] || 0) + Number(venta.tot_vent);
    }

    return Object.entries(agrupacion).map(([periodo, total]) => ({
      periodo,
      total: Math.round(total * 100) / 100, // evita flotantes
    }));
  }
  // Obtener las últimas N ventas
  async obtenerUltimasVentas(limit = 5): Promise<any[]> {
    const ventas = await this.ventaRepository.find({
      relations: ['usu_vent'],
      order: { fech_vent: 'DESC' },
      take: limit,
    });

    return ventas.map((venta) => ({
      id_vent: venta.id_vent,
      usuario: venta.usu_vent?.nom_usu,
      total: venta.tot_vent,
      fecha: venta.fech_vent,
      metodo_pago: venta.tip_pag_vent,
      estado: venta.est_vent,
    }));
  }

  // Obtener ventas por transferencia con comprobante pendientes
  async ventasPendientesPorTransferencia(): Promise<any[]> {
    const ventas = await this.ventaRepository.find({
      where: {
        tip_pag_vent: 'transferencia',
        comprobante_num_vent: Not(IsNull()),
        comprobante_img_vent: Not(IsNull()),
        est_vent: 'Por validar',
      },
    });

    return ventas.map((venta) => ({
      id_vent: venta.id_vent,
      usuario: venta.usu_vent?.nom_usu,
      total: venta.tot_vent,
      fecha: venta.fech_vent,
      comprobante: venta.comprobante_num_vent,
      imagen: venta.comprobante_img_vent,
    }));
  }

  async exportarExcelPorPeriodo(
    tipo: 'diario' | 'semanal' | 'mensual',
    desde?: string,
    hasta?: string,
  ): Promise<Buffer> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Ventas ${tipo}`);

    const azul = '305496';
    const blanco = 'FFFFFF';
    const grisClaro = 'F2F2F2';
    const grisMedio = 'D9D9D9';

    let fila = 1;

    // Título
    worksheet.mergeCells(`A${fila}:G${fila}`);
    const titulo = worksheet.getCell(`A${fila}`);
    titulo.value = `REPORTE DE VENTAS (${tipo.toUpperCase()})`;
    titulo.font = { size: 18, bold: true, color: { argb: azul } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };
    fila += 2;

    // Fechas
    const desdeFmt = desde ? new Date(desde).toLocaleDateString('es-EC') : '-';
    const hastaFmt = hasta ? new Date(hasta).toLocaleDateString('es-EC') : '-';

    worksheet.getCell(`A${fila}`).value = `Desde: ${desdeFmt}`;
    worksheet.getCell(`B${fila}`).value = `Hasta: ${hastaFmt}`;
    worksheet.getCell(`A${fila}`).font = { italic: true };
    worksheet.getCell(`B${fila}`).font = { italic: true };
    fila += 2;

    // Encabezado
    worksheet.addRow([
      'ID Venta',
      'Fecha',
      'Método de Pago',
      'Estado',
      'Recibido ($)',
      'Cambio ($)',
      'Total ($)',
    ]);
    const encabezado = worksheet.getRow(fila);
    encabezado.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: azul },
      };
      cell.font = { bold: true, color: { argb: blanco } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    fila++;

    // Obtener ventas filtradas
    const ventas = await this.listarVentasConDetallesPorPeriodo(desde, hasta);
    if (!ventas.length) {
      throw new NotFoundException('No se encontraron ventas en el periodo.');
    }

    for (const venta of ventas) {
      // Fila de venta
      const row = worksheet.addRow([
        venta.id_venta,
        new Date(venta.fecha).toLocaleDateString('es-EC'),
        venta.tipoPago,
        venta.estado,
        venta.efectivoRecibido,
        venta.efectivoCambio,
        venta.total,
      ]);
      row.eachCell((cell, col) => {
        if ([5, 6, 7].includes(col)) {
          cell.numFmt = '"$"#,##0.00';
        }
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { horizontal: 'center' };
      });
      fila++;

      // Detalle de productos
      worksheet.mergeCells(`B${fila}:G${fila}`);
      worksheet.getCell(`B${fila}`).value = 'DETALLE DE PRODUCTOS';
      worksheet.getCell(`B${fila}`).font = { bold: true };
      worksheet.getCell(`B${fila}`).alignment = { horizontal: 'left' };
      fila++;

      worksheet.getRow(fila).values = [
        '',
        'Producto',
        'Cantidad',
        'Precio ($)',
        'Subtotal ($)',
      ];
      worksheet.getRow(fila).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: grisMedio },
        };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      fila++;

      for (const prod of venta.productos) {
        const detalleRow = worksheet.addRow([
          '',
          prod.nombre,
          prod.cantidad,
          prod.precio,
          prod.subtotal,
        ]);
        detalleRow.eachCell((cell, col) => {
          if ([4, 5].includes(col)) {
            cell.numFmt = '"$"#,##0.00';
          }
          cell.alignment = { horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
        fila++;
      }

      fila++;
    }

    // Ajustar ancho
    worksheet.columns.forEach((col) => {
      let max = 12;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const length = (cell.value?.toString().length ?? 0) + 2;
        if (length > max) max = length;
      });
      col.width = max;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportarPDFPorPeriodo(
    tipo: 'diario' | 'semanal' | 'mensual',
    desde?: string,
    hasta?: string,
  ): Promise<Buffer> {
    const ventas = await this.listarVentasConDetallesPorPeriodo(desde, hasta);
    if (!ventas.length) {
      throw new NotFoundException('No se encontraron ventas en el periodo.');
    }

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };

    const printer = new PdfPrinter(fonts);
    const docDefinition = {
      content: [
        { text: `REPORTE DE VENTAS (${tipo.toUpperCase()})`, style: 'header' },
        {
          columns: [
            {
              text: `Desde: ${desde ? new Date(desde).toLocaleDateString('es-EC') : '-'}`,
              style: 'subheader',
            },
            {
              text: `Hasta: ${hasta ? new Date(hasta).toLocaleDateString('es-EC') : '-'}`,
              style: 'subheader',
              alignment: 'right',
            },
          ],
        },
        '\n',
        ...ventas.flatMap((venta) => [
          {
            table: {
              widths: ['*', '*', '*', '*', '*', '*', '*'],
              body: [
                [
                  'ID',
                  'Fecha',
                  'Método de Pago',
                  'Estado',
                  'Recibido ($)',
                  'Cambio ($)',
                  'Total ($)',
                ],
                [
                  venta.id_venta,
                  new Date(venta.fecha).toLocaleDateString('es-EC'),
                  venta.tipoPago,
                  venta.estado,
                  `$${Number(venta.efectivoRecibido || 0).toFixed(2)}`,
                  `$${Number(venta.efectivoCambio || 0).toFixed(2)}`,
                  `$${Number(venta.total || 0).toFixed(2)}`,
                ],
              ],
            },
            layout: 'lightHorizontalLines',
          },
          '\n',
          { text: 'Detalle de productos', bold: true, margin: [0, 5, 0, 3] },
          {
            table: {
              widths: ['*', '*', '*', '*'],
              body: [
                ['Producto', 'Cantidad', 'Precio ($)', 'Subtotal ($)'],
                ...venta.productos.map((p) => [
                  p.nombre,
                  p.cantidad,
                  `$${Number(p.precio || 0).toFixed(2)}`,
                  `$${Number(p.subtotal || 0).toFixed(2)}`,
                ]),
              ],
            },
            layout: 'lightHorizontalLines',
          },
          '\n\n',
        ]),
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },
        subheader: { fontSize: 10, italics: true },
      },
      defaultStyle: {
        font: 'Roboto',
      },
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Uint8Array[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.end();
    });
  }

  
}
