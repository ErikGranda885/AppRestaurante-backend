import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Raw, Repository } from 'typeorm';
import { Cierre_Dia } from './cierre_dia.entity';
import { CreateCierreDiarioDto } from './dto/create-cierreDiario.dto';
import { Venta } from 'src/ventas/venta.entity';
import { Gasto } from 'src/gastos/gasto.entity';
import { Compras } from 'src/compras/compras.entity';
import { FiltroCierreDto } from './dto/filtro-cierre.dto';
import { Workbook } from 'exceljs';
import * as PdfPrinter from 'pdfmake';
@Injectable()
export class CierreDiaService {
  private readonly logger = new Logger(CierreDiaService.name);

  constructor(
    @InjectRepository(Cierre_Dia)
    private readonly cierreRepository: Repository<Cierre_Dia>,
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    @InjectRepository(Compras)
    private readonly compraRepository: Repository<Compras>,
  ) {}

  async crearCierre(
    createCierreDiarioDto: CreateCierreDiarioDto,
  ): Promise<Cierre_Dia> {
    const { usu_cier, ...restoDatos } = createCierreDiarioDto;
    const nuevoCierre = this.cierreRepository.create({
      ...restoDatos,
      usu_cier: { id_usu: Number(usu_cier) },
    });
    return await this.cierreRepository.save(nuevoCierre);
  }

  async registrarDepositoYCerrar(
    id_cier: number,
    datos: {
      tot_dep_cier: number;
      comp_dep_cier: string;
      esta_cier?: string;
    },
  ): Promise<Cierre_Dia> {
    const cierre = await this.cierreRepository.findOneBy({ id_cier });
    if (!cierre) {
      throw new NotFoundException(`Cierre con ID ${id_cier} no encontrado`);
    }

    const fecha = cierre.fech_cier;
    const [year, month, day] = fecha.split('-').map(Number);
    const inicioDia = new Date(year, month - 1, day, 0, 0, 0);
    const finDia = new Date(year, month - 1, day, 23, 59, 59, 999);

    // 🚨 Buscar transferencias del día en estado "Por validar"
    const transferenciasPendientes = await this.ventaRepository.find({
      where: {
        fech_vent: Between(inicioDia, finDia),
        tip_pag_vent: 'transferencia',
        est_vent: 'Por validar',
      },
    });

    if (transferenciasPendientes.length > 0) {
      throw new BadRequestException(
        `No se puede cerrar el día ${fecha}. Existen ${transferenciasPendientes.length} transferencias sin validar.`,
      );
    }

    // ✅ Buscar ventas efectivas no cerradas
    const ventasPorCerrar = await this.ventaRepository.find({
      where: {
        fech_vent: Between(inicioDia, finDia),
        est_vent: 'Sin cerrar', // Efectivo que aún no ha sido cerrado
      },
    });

    for (const venta of ventasPorCerrar) {
      venta.est_vent = 'Cerrada';
      await this.ventaRepository.save(venta);
    }

    // 💾 Continuar con el registro del cierre
    cierre.tot_dep_cier = datos.tot_dep_cier;
    cierre.comp_dep_cier = datos.comp_dep_cier;
    cierre.esta_cier = datos.esta_cier ?? cierre.esta_cier;

    cierre.dif_cier =
      Number(cierre.tot_vent_cier) -
      (Number(cierre.tot_gas_cier) +
        Number(cierre.tot_compras_pag_cier) +
        Number(cierre.tot_dep_cier));

    return await this.cierreRepository.save(cierre);
  }

  async listarTodosCierres(filtro?: FiltroCierreDto): Promise<Cierre_Dia[]> {
    const where: any = {};
    if (filtro?.desde && filtro?.hasta) {
      where.fech_cier = Between(filtro.desde, filtro.hasta);
    }
    if (filtro?.estado) {
      where.esta_cier = filtro.estado;
    }

    return await this.cierreRepository.find({
      where,
      order: { fech_cier: 'DESC' },
    });
  }

  async listarCierresPorCerrar(
    filtro?: FiltroCierreDto,
  ): Promise<Cierre_Dia[]> {
    const where: any = { esta_cier: 'por cerrar' };
    if (filtro?.desde && filtro?.hasta) {
      where.fech_cier = Between(filtro.desde, filtro.hasta);
    }

    return await this.cierreRepository.find({
      where,
      order: { fech_cier: 'DESC' },
    });
  }

  async obtenerResumenDelDia(fecha: string) {
    const resumen = await this.obtenerMovimientosDelDia(fecha);
    const { totalVentas, totalGastos, totalComprasPagadas } = resumen;

    if (totalVentas === 0 && totalGastos === 0 && totalComprasPagadas === 0) {
      this.logger.warn(
        `⚠️ No se encontraron registros de ventas, gastos o compras pagadas para la fecha ${fecha}`,
      );
    }

    return resumen;
  }

  async obtenerMovimientosDelDia(fecha: string) {
    const [year, month, day] = fecha.split('-').map(Number);
    const inicioDia = new Date(year, month - 1, day, 0, 0, 0);
    const finDia = new Date(year, month - 1, day, 23, 59, 59, 999);

    const ventas = await this.ventaRepository.find({
      where: { fech_vent: Between(inicioDia, finDia) },
    });

    const gastos = await this.gastoRepository.find({
      where: { fech_gas: Between(inicioDia, finDia) },
    });

    const compras = await this.compraRepository.find({
      where: {
        fech_comp: Between(inicioDia, finDia),
        estado_pag_comp: 'pagada',
      },
    });

    const totalVentas = ventas.reduce(
      (sum, venta) => sum + Number(venta.tot_vent || 0),
      0,
    );

    const totalGastos = gastos.reduce(
      (sum, gasto) => sum + Number(gasto.mont_gas || 0),
      0,
    );

    const totalComprasPagadas = compras.reduce(
      (sum, comp) => sum + Number(comp.tot_comp || 0),
      0,
    );

    return {
      ventas,
      gastos,
      compras,
      totalVentas,
      totalGastos,
      totalComprasPagadas,
    };
  }

  async actualizarResumenDelDia(fecha: string): Promise<void> {
    const cierreExistente = await this.cierreRepository.findOne({
      where: { fech_cier: fecha },
    });

    if (!cierreExistente) {
      const resumen = await this.obtenerMovimientosDelDia(fecha);
      await this.cierreRepository.insert({
        fech_cier: fecha,
        esta_cier: 'por cerrar',
        tot_dep_cier: 0,
        tot_vent_cier: resumen.totalVentas,
        tot_gas_cier: resumen.totalGastos,
        tot_compras_pag_cier: resumen.totalComprasPagadas,
        dif_cier:
          resumen.totalVentas -
          resumen.totalGastos -
          resumen.totalComprasPagadas,
      });
      this.logger.log(`✅ Nuevo cierre creado para el día ${fecha}.`);
      return;
    }

    // ❌ Solo bloquea si ya está cerrado
    if (cierreExistente.esta_cier === 'cerrado') {
      this.logger.warn(
        `⚠️ El cierre del ${fecha} ya está en estado 'cerrado', no se actualizará.`,
      );
      return;
    }

    // ✅ Permite actualizar si está en "por cerrar" o "pendiente"
    const resumen = await this.obtenerMovimientosDelDia(fecha);
    const totalDepositado = cierreExistente?.tot_dep_cier ?? 0;
    const diferenciaCalculada =
      resumen.totalVentas -
      resumen.totalGastos -
      resumen.totalComprasPagadas -
      totalDepositado;

    const datosActualizados = {
      tot_vent_cier: resumen.totalVentas,
      tot_gas_cier: resumen.totalGastos,
      tot_compras_pag_cier: resumen.totalComprasPagadas,
      dif_cier: diferenciaCalculada,
    };

    await this.cierreRepository.update(
      cierreExistente.id_cier,
      datosActualizados,
    );
    this.logger.log(
      `🔄 Cierre del día ${fecha} en estado '${cierreExistente.esta_cier}' actualizado correctamente.`,
    );
  }

  async verificarOCrearCierreSiNoExiste(fecha: string): Promise<void> {
    const cierreExistente = await this.cierreRepository.findOne({
      where: { fech_cier: fecha },
    });

    if (cierreExistente) {
      if (cierreExistente.esta_cier === 'pendiente') {
        this.logger.warn(
          `⚠️ El cierre del ${fecha} ya existe y está en estado 'pendiente'. Se recomienda continuar el registro en ese cierre.`,
        );
      } else {
        this.logger.log(
          `ℹ️ Ya existe un cierre para ${fecha} con estado '${cierreExistente.esta_cier}', no se creará otro.`,
        );
      }
      return;
    }

    // ⚠️ Verifica que no haya cierres anteriores pendientes
    const hayPendientes = await this.existenPendientesAnteriores(fecha);
    if (hayPendientes) {
      this.logger.warn(
        `🚫 No se puede crear cierre para ${fecha} porque hay cierres anteriores pendientes.`,
      );
      return;
    }

    const resumen = await this.obtenerResumenDelDia(fecha);

    const ahoraLocal = new Date();
    ahoraLocal.setMinutes(
      ahoraLocal.getMinutes() - ahoraLocal.getTimezoneOffset(),
    );
    const fech_reg_local = ahoraLocal.toISOString();

    const nuevoCierre = {
      fech_cier: fecha,
      tot_vent_cier: resumen.totalVentas,
      tot_gas_cier: resumen.totalGastos,
      tot_compras_pag_cier: resumen.totalComprasPagadas,
      tot_dep_cier: 0,
      dif_cier:
        resumen.totalVentas - resumen.totalGastos - resumen.totalComprasPagadas,
      fech_reg_cier: fech_reg_local,
      usu_cier: 1,
      esta_cier: 'por cerrar',
    };

    await this.crearCierre(nuevoCierre);
    this.logger.log(`✅ [Auto] Cierre creado para ${fecha}`);
  }

  async buscarCierrePorId(id: number): Promise<Cierre_Dia> {
    const cierre = await this.cierreRepository.findOne({
      where: { id_cier: id },
    });
    if (!cierre)
      throw new NotFoundException(`Cierre con ID ${id} no encontrado`);
    return cierre;
  }

  async actualizarEstadoCierre(id: number, nuevoEstado: string): Promise<void> {
    await this.cierreRepository.update(id, { esta_cier: nuevoEstado });
  }

  async eliminarCierre(id: number): Promise<void> {
    const cierre = await this.buscarCierrePorId(id);
    await this.cierreRepository.remove(cierre);
  }

  async existeCierrePorFecha(fecha: string): Promise<boolean> {
    const cierre = await this.cierreRepository.findOne({
      where: { fech_cier: fecha },
    });
    return !!cierre;
  }

  async esDiaCerrado(fecha: string): Promise<boolean> {
    const cierre = await this.cierreRepository.findOne({
      where: { fech_cier: fecha },
    });

    return cierre?.esta_cier === 'cerrado';
  }

  async existenPendientesAnteriores(fecha: string): Promise<boolean> {
    const anteriores = await this.cierreRepository.find({
      where: {
        esta_cier: 'pendiente',
        fech_cier: Raw((alias) => `${alias} < :fecha`, { fecha }),
      },
    });
    return anteriores.length > 0;
  }

  async exportarCierresExcel(): Promise<Buffer> {
    const cierres = await this.cierreRepository.find({
      order: { fech_cier: 'DESC' },
    });
    if (!cierres.length) {
      throw new NotFoundException('No existen cierres registrados');
    }

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Cierres');

    worksheet.mergeCells('A1:I1');
    const titulo = worksheet.getCell('A1');
    titulo.value = 'REPORTE DE CIERRES DIARIOS';
    titulo.font = { size: 18, bold: true, color: { argb: '305496' } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([
      'Fecha',
      'Ventas ($)',
      'Depósito ($)',
      'Compras pagadas ($)',
      'Gastos ($)',
      'Diferencia ($)',
      'Comprobante',
      'Registrado por',
      'Estado',
    ]);

    worksheet.getRow(2).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    cierres.forEach((c) => {
      worksheet.addRow([
        c.fech_cier,
        Number(c.tot_vent_cier),
        Number(c.tot_dep_cier ?? 0),
        Number(c.tot_compras_pag_cier),
        Number(c.tot_gas_cier),
        Number(c.dif_cier),
        c.comp_dep_cier || '',
        c.usu_cier?.nom_usu || 'Desconocido',
        c.esta_cier,
      ]);
    });

    worksheet.columns.forEach((column, i) => {
      let maxLength = 10;
      if (column && typeof column.eachCell === 'function') {
        column.eachCell({ includeEmpty: true }, (cell) => {
          const length = cell.value?.toString().length || 0;
          if (length > maxLength) maxLength = length;
        });
      }
      worksheet.getColumn(i + 1).width = maxLength + 2;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportarCierresPDF(): Promise<Buffer> {
    const cierres = await this.cierreRepository.find({
      order: { fech_cier: 'DESC' },
    });
    if (!cierres.length) {
      throw new NotFoundException('No existen cierres registrados');
    }

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };

    const body: any[][] = [
      [
        { text: 'Fecha', bold: true },
        { text: 'Ventas ($)', bold: true },
        { text: 'Depósito ($)', bold: true },
        { text: 'Compras pagadas ($)', bold: true },
        { text: 'Gastos ($)', bold: true },
        { text: 'Diferencia ($)', bold: true },
        { text: 'Comprobante', bold: true },
        { text: 'Registrado por', bold: true },
        { text: 'Estado', bold: true },
      ],
      ...cierres.map((c) => [
        c.fech_cier,
        Number(c.tot_vent_cier).toFixed(2),
        Number(c.tot_dep_cier ?? 0).toFixed(2),
        Number(c.tot_compras_pag_cier).toFixed(2),
        Number(c.tot_gas_cier).toFixed(2),
        Number(c.dif_cier).toFixed(2),
        c.comp_dep_cier || '',
        c.usu_cier?.nom_usu || 'Desconocido',
        c.esta_cier,
      ]),
    ];

    const printer = new PdfPrinter(fonts);
    const docDefinition = {
      pageOrientation: 'landscape',
      content: [
        { text: 'REPORTE DE CIERRES DIARIOS', style: 'header' },
        '\n',
        {
          table: {
            headerRows: 1,
            widths: [
              'auto',
              'auto',
              'auto',
              'auto',
              'auto',
              'auto',
              '*',
              '*',
              'auto',
            ],
            body,
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10],
          color: '#305496',
        },
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
