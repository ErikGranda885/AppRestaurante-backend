import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { Categoria } from 'src/categorias/categoria.entity';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Workbook } from 'exceljs';
import * as PdfPrinter from 'pdfmake';
import { ProductosGateway } from 'src/gateways/productos.gateway';
import { Lote } from 'src/lotes/lote.entity';
import { LotesService } from 'src/lotes/lotes.service';
import { LotesModule } from 'src/lotes/lotes.module';
@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productosRepository: Repository<Producto>,
    @InjectRepository(Categoria)
    private categoriaRepository: Repository<Categoria>,
    private dataSource: DataSource,
    private productosGateway: ProductosGateway,
    private readonly lotesService: LotesService,
    @InjectRepository(Lote)
    private lotesRepository: Repository<Lote>,
  ) {}

  async crearProductosMasivo(
    createProductosDto: CreateProductoDto[],
  ): Promise<{ productos: Producto[]; errors: any[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const productosCreados: Producto[] = [];
    try {
      for (const dto of createProductosDto) {
        const {
          cate_prod,
          stock_prod,
          prec_vent_prod,
          fecha_venc_lote,
          ...productData
        } = dto;

        const cateValue = String(cate_prod);

        const productoExistente = await queryRunner.manager.findOne(Producto, {
          where: { nom_prod: productData.nom_prod },
        });
        if (productoExistente) {
          throw new BadRequestException(
            `El producto con nombre ${productData.nom_prod} ya está registrado`,
          );
        }

        let categoria: Categoria | null = null;
        if (!isNaN(Number(cateValue))) {
          categoria = await queryRunner.manager.findOne(Categoria, {
            where: { id_cate: Number(cateValue) },
          });
        } else {
          categoria = await queryRunner.manager.findOne(Categoria, {
            where: { nom_cate: cateValue },
          });
        }

        if (!categoria) {
          throw new NotFoundException(
            `La categoría con id/nombre ${cateValue} no fue encontrada`,
          );
        }

        const producto = this.productosRepository.create({
          ...productData,
          prec_vent_prod: prec_vent_prod ?? 0,
          cate_prod: categoria,
        });

        const productoGuardado = await queryRunner.manager.save(producto);
        productosCreados.push(productoGuardado);

        const stock = Number(stock_prod);
        if (!isNaN(stock) && stock > 0) {
          const lote = this.lotesRepository.create({
            prod_lote: productoGuardado,
            cant_tot_lote: stock,
            cant_disp_lote: stock,
            cant_usad_lote: 0,
            fecha_venc_lote: fecha_venc_lote ? new Date(fecha_venc_lote) : null,
            esta_lote: 'vigente',
            orig_lote: 'inicial',
            id_origen: 0,
          });

          await queryRunner.manager.save(lote); // Usar el mismo transaction manager
        }
      }

      await queryRunner.commitTransaction();

      this.productosGateway.emitirActualizacionProductos();
      console.log("📡 Evento 'productos-actualizados' emitido (masivo)");

      return { productos: productosCreados, errors: [] };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async buscarPorCategoria(
    idCategoria: number,
  ): Promise<{ message: string; productos: Producto[] }> {
    const productos = await this.productosRepository.find({
      where: { cate_prod: { id_cate: idCategoria } },
    });
    if (!productos || productos.length === 0) {
      throw new NotFoundException(
        `No se encontraron productos para la categoría con id ${idCategoria}`,
      );
    }
    return {
      message: 'Productos obtenidos correctamente',
      productos,
    };
  }

  async listarProductos(): Promise<Producto[]> {
    return this.productosRepository.find();
  }

  async listarProducto(id: number): Promise<Producto> {
    const producto = await this.productosRepository.findOne({
      where: { id_prod: id },
    });
    if (!producto) {
      throw new NotFoundException(
        `El producto con id: ${id} no fue encontrado`,
      );
    }
    return producto;
  }

  async actualizarProducto(
    id: number,
    updateProductoDto: UpdateProductoDto,
  ): Promise<{ message: string; producto: Producto }> {
    const producto = await this.listarProducto(id);

    if (
      updateProductoDto.nom_prod &&
      updateProductoDto.nom_prod !== producto.nom_prod
    ) {
      const productoExistente = await this.productosRepository.findOne({
        where: { nom_prod: updateProductoDto.nom_prod },
      });
      if (productoExistente) {
        throw new ConflictException(
          `El producto con el nombre "${updateProductoDto.nom_prod}" ya se encuentra registrado.`,
        );
      }
    }

    // Actualizamos el producto con los nuevos valores
    Object.assign(producto, updateProductoDto);
    const productoActualizado = await this.productosRepository.save(producto);
    this.productosGateway.emitirActualizacionProductos(); // 👈 evento en tiempo real
    console.log('📡 Evento productos-actualizados emitido (actualización)');

    return {
      message: 'Producto actualizado correctamente',
      producto: productoActualizado,
    };
  }

  async crearProducto(
    createProductoDto: CreateProductoDto,
  ): Promise<{ message: string; producto: Producto }> {
    const { cate_prod, tip_prod, ...productoData } = createProductoDto;

    let categoria: Categoria | null = null;

    // Si el producto no es de tipo "insumo", se verifica la categoría.
    if (tip_prod.toLowerCase() !== 'insumo') {
      categoria = await this.categoriaRepository.findOne({
        where: { id_cate: cate_prod },
      });
      if (!categoria) {
        throw new NotFoundException(
          `La categoría con id ${cate_prod} no fue encontrada`,
        );
      }
    }

    const producto = this.productosRepository.create({
      ...productoData,
      tip_prod,
      cate_prod: categoria,
    });

    const productoGuardado = await this.productosRepository.save(producto);
    this.productosGateway.emitirActualizacionProductos();
    console.log('📡 Evento productos-actualizados emitido (creación)');
    return {
      message: 'Producto creado correctamente',
      producto: productoGuardado,
    };
  }

  async productoRegistrado(nombre: string): Promise<boolean> {
    const producto = await this.productosRepository.findOne({
      where: { nom_prod: nombre },
    });
    return !!producto;
  }

  async inactivarProducto(
    id: number,
    updateProductoDto?: UpdateProductoDto,
  ): Promise<{ message: string; producto: Producto }> {
    const producto = await this.listarProducto(id);
    producto.est_prod = 'Inactivo';
    if (updateProductoDto) {
      if ('est_prod' in updateProductoDto) {
        delete updateProductoDto.est_prod;
      }
      Object.assign(producto, updateProductoDto);
    }

    const productoInactivado = await this.productosRepository.save(producto);
    this.productosGateway.emitirActualizacionProductos(); // 👈 evento en tiempo real
    console.log('📡 Evento productos-actualizados emitido (inactivado)');
    return {
      message: 'Producto inactivado correctamente',
      producto: productoInactivado,
    };
  }

  async activarProducto(
    id: number,
    updateProductoDto?: UpdateProductoDto,
  ): Promise<{ message: string; producto: Producto }> {
    const producto = await this.listarProducto(id);
    producto.est_prod = 'Activo';

    if (updateProductoDto) {
      if ('est_prod' in updateProductoDto) {
        delete updateProductoDto.est_prod;
      }
      Object.assign(producto, updateProductoDto);
    }

    const productoActivado = await this.productosRepository.save(producto);
    this.productosGateway.emitirActualizacionProductos(); // 👈 evento en tiempo real
    console.log('📡 Evento productos-actualizados emitido (activado)');
    return {
      message: 'Producto activado correctamente',
      producto: productoActivado,
    };
  }

  async obtenerProductosPopulares(limit: number = 7): Promise<any[]> {
    const result = await this.productosRepository
      .createQueryBuilder('producto')
      .leftJoin('producto.det_ventas', 'detalle')
      .select('producto.id_prod', 'id')
      .addSelect('producto.nom_prod', 'name')
      .addSelect('producto.img_prod', 'img')
      .addSelect('SUM(detalle.cant_dventa)', 'orders')
      .where('producto.tip_prod != :tipo', { tipo: 'Insumo' }) // ⬅️ Exclusión
      .groupBy('producto.id_prod')
      .orderBy('orders', 'DESC')
      .limit(limit)
      .getRawMany();

    return result;
  }

  async exportarReporteProductosInsumoExcel(
    desde?: string,
    hasta?: string,
  ): Promise<Buffer> {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Productos Insumo');

    const azul = '305496';
    const blanco = 'FFFFFF';
    let fila = 1;

    worksheet.mergeCells(`A${fila}:H${fila}`);
    const titulo = worksheet.getCell(`A${fila}`);
    titulo.value = `REPORTE DE PRODUCTOS INSUMO`;
    titulo.font = { size: 18, bold: true, color: { argb: azul } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };
    fila += 2;

    const desdeDate = desde ? new Date(`${desde}T00:00:00`) : new Date();
    const hastaDate = hasta ? new Date(`${hasta}T23:59:59`) : new Date();

    worksheet.getCell(`A${fila}`).value =
      `Desde: ${desdeDate.toLocaleDateString('es-EC')}`;
    worksheet.getCell(`B${fila}`).value =
      `Hasta: ${hastaDate.toLocaleDateString('es-EC')}`;
    worksheet.getCell(`A${fila}`).font = { italic: true };
    worksheet.getCell(`B${fila}`).font = { italic: true };
    fila += 2;

    const fechas: Date[] = [];
    for (
      let d = new Date(desdeDate);
      d <= hastaDate;
      d.setDate(d.getDate() + 1)
    ) {
      fechas.push(new Date(d));
    }

    const headerBase = ['ID', 'Nombre', 'Tipo', 'Unidad base', 'Equivalente'];
    const headerFechas = fechas.flatMap((f) => {
      const label = f.toLocaleDateString('es-EC');
      return [`Stock ${label}`, `Interpretación ${label}`];
    });

    worksheet.addRow([...headerBase, ...headerFechas]);
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

    worksheet.views = [{ state: 'frozen', ySplit: fila }];

    const productos = await this.productosRepository.find();
    const equivalencias = await this.dataSource
      .getRepository('equivalencias')
      .createQueryBuilder('equiv')
      .leftJoinAndSelect('equiv.prod_equiv', 'producto')
      .getMany();

    const lotes = await this.dataSource
      .getRepository('lotes')
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.prod_lote', 'producto')
      .where('DATE(l.crea_en_lote) <= :hasta', {
        hasta: hastaDate.toISOString().split('T')[0],
      })
      .getMany();

    const transformaciones = await this.dataSource
      .getRepository('transformaciones')
      .createQueryBuilder('trans')
      .leftJoinAndSelect('trans.rece_trans', 'receta')
      .leftJoinAndSelect('receta.ingredientes', 'det_rec')
      .leftJoinAndSelect('det_rec.prod_rec', 'producto')
      .where('DATE(trans.fecha_trans) BETWEEN :desde AND :hasta', {
        desde: desdeDate.toISOString().split('T')[0],
        hasta: hastaDate.toISOString().split('T')[0],
      })
      .getMany();

    function fechaLocal(date: Date): Date {
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    }

    function esMismaFecha(d1: Date, d2: Date): boolean {
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    }

    const insumos = productos.filter((p) => p.tip_prod === 'Insumo');
    const insumosConEquivalencia = insumos.filter((p) =>
      equivalencias.find((e) => e.prod_equiv.id_prod === p.id_prod),
    );

    if (insumosConEquivalencia.length === 0) {
      throw new NotFoundException(
        'No se encontraron insumos con equivalencias registradas.',
      );
    }

    for (const producto of insumosConEquivalencia) {
      const equiv = equivalencias.find(
        (e) => e.prod_equiv.id_prod === producto.id_prod,
      );
      if (!equiv) continue;

      const unidadBase = producto.und_prod;
      const unidadEquiv = equiv.und_prod_equiv;
      const cantEquiv = equiv.cant_equiv;

      const baseRow = [
        producto.id_prod,
        producto.nom_prod,
        producto.tip_prod,
        unidadBase,
        `1 ${unidadBase} = ${cantEquiv} ${unidadEquiv}`,
      ];

      const filasFecha = fechas
        .map((fecha) => {
          const comprasAntes = lotes
            .filter(
              (l) =>
                l.prod_lote?.id_prod === producto.id_prod &&
                l.orig_lote === 'compra' &&
                fechaLocal(new Date(l.crea_en_lote)) < fecha,
            )
            .reduce((sum, l) => sum + Number(l.cant_tot_lote), 0);

          const consumoAntes = transformaciones
            .flatMap((t) =>
              t.rece_trans.ingredientes
                .filter(
                  (i) =>
                    i.prod_rec.id_prod === producto.id_prod &&
                    fechaLocal(new Date(t.fecha_trans)) < fecha,
                )
                .map((i) => i.cant_rec * t.cant_prod_trans),
            )
            .reduce((sum, cant) => sum + cant, 0);

          const stockInicial = comprasAntes - consumoAntes;

          const comprasDia = lotes
            .filter(
              (l) =>
                l.prod_lote?.id_prod === producto.id_prod &&
                l.orig_lote === 'compra' &&
                esMismaFecha(fechaLocal(new Date(l.crea_en_lote)), fecha),
            )
            .reduce((sum, l) => sum + Number(l.cant_tot_lote), 0);

          const consumoDia = transformaciones
            .flatMap((t) =>
              t.rece_trans.ingredientes
                .filter(
                  (i) =>
                    i.prod_rec.id_prod === producto.id_prod &&
                    esMismaFecha(fechaLocal(new Date(t.fecha_trans)), fecha),
                )
                .map((i) => i.cant_rec * t.cant_prod_trans),
            )
            .reduce((sum, cant) => sum + cant, 0);

          const stockFinal = stockInicial + comprasDia - consumoDia;

          console.log(`🟡 Producto: ${producto.nom_prod}`);
          console.log(`📅 Fecha: ${fecha.toLocaleDateString('es-EC')}`);
          console.log(`  Stock inicial: ${stockInicial}`);
          console.log(`  Compras del día: ${comprasDia}`);
          console.log(`  Consumo del día: ${consumoDia}`);
          console.log(`  Stock final: ${stockFinal}`);

          let interpretacion = '-';

          if (stockFinal <= 0) {
            interpretacion = `Sin stock`;
          } else {
            const cantidad = stockFinal / cantEquiv;
            const enteros = Math.floor(cantidad);
            const decimales = Number((cantidad - enteros).toFixed(2));

            const unidadFracc = unidadBase === 'und' ? unidadEquiv : unidadBase;

            if (unidadBase === 'und') {
              if (enteros > 0 && decimales > 0) {
                interpretacion = `${enteros} ${unidadBase} + ${Math.round(decimales * cantEquiv)} ${unidadFracc}`;
              } else if (enteros > 0) {
                interpretacion = `${enteros} ${unidadBase}`;
              } else {
                interpretacion = `${Math.round(decimales * cantEquiv)} ${unidadFracc}`;
              }
            } else {
              if (enteros > 0 && decimales > 0) {
                interpretacion = `${enteros} ${unidadBase} + ${decimales} ${unidadFracc}`;
              } else if (enteros > 0) {
                interpretacion = `${enteros} ${unidadBase}`;
              } else {
                interpretacion = `${decimales} ${unidadFracc}`;
              }
            }
          }

          return [stockFinal, interpretacion];
        })
        .flat();

      const newRow = worksheet.addRow([...baseRow, ...filasFecha]);
      newRow.eachCell((cell) => {
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

    worksheet.columns.forEach((column) => {
      if (column) {
        let maxLength = 10;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const value = cell.value;
          const length = value ? value.toString().length : 0;
          if (length > maxLength) maxLength = length;
        });
        column.width = maxLength + 2;
      }
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportarReporteProductosInsumoPDF(
    desde?: string,
    hasta?: string,
  ): Promise<Buffer> {
    const desdeDate = desde ? new Date(`${desde}T00:00:00`) : new Date();
    const hastaDate = hasta ? new Date(`${hasta}T23:59:59`) : new Date();

    const productos = await this.productosRepository.find();
    const equivalencias = await this.dataSource
      .getRepository('equivalencias')
      .createQueryBuilder('equiv')
      .leftJoinAndSelect('equiv.prod_equiv', 'producto')
      .getMany();

    const lotes = await this.dataSource
      .getRepository('lotes')
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.prod_lote', 'producto')
      .where('DATE(l.crea_en_lote) <= :hasta', {
        hasta: hastaDate.toISOString().split('T')[0],
      })
      .getMany();

    const transformaciones = await this.dataSource
      .getRepository('transformaciones')
      .createQueryBuilder('trans')
      .leftJoinAndSelect('trans.rece_trans', 'receta')
      .leftJoinAndSelect('receta.ingredientes', 'det_rec')
      .leftJoinAndSelect('det_rec.prod_rec', 'producto')
      .where('DATE(trans.fecha_trans) BETWEEN :desde AND :hasta', {
        desde: desdeDate.toISOString().split('T')[0],
        hasta: hastaDate.toISOString().split('T')[0],
      })
      .getMany();

    const fechas: Date[] = [];
    for (
      let d = new Date(desdeDate);
      d <= hastaDate;
      d.setDate(d.getDate() + 1)
    ) {
      fechas.push(new Date(d));
    }

    function esMismaFecha(d1: Date, d2: Date): boolean {
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    }

    function fechaLocal(date: Date): Date {
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    }

    const insumos = productos.filter((p) => p.tip_prod === 'Insumo');
    const insumosConEquivalencia = insumos.filter((p) =>
      equivalencias.find((e) => e.prod_equiv.id_prod === p.id_prod),
    );

    if (insumosConEquivalencia.length === 0) {
      throw new NotFoundException(
        'No se encontraron insumos con equivalencias registradas.',
      );
    }

    const body: any[][] = [
      [
        { text: 'ID', bold: true },
        { text: 'Nombre', bold: true },
        { text: 'Unidad Base', bold: true },
        { text: 'Equivalencia', bold: true },
        ...fechas.flatMap((f) => [
          { text: `Stock ${f.toLocaleDateString('es-EC')}`, bold: true },
          { text: `Interpr.`, bold: true },
        ]),
      ],
    ];

    for (const producto of insumosConEquivalencia) {
      const equiv = equivalencias.find(
        (e) => e.prod_equiv.id_prod === producto.id_prod,
      );
      if (!equiv) continue;

      const unidadBase = producto.und_prod;
      const unidadEquiv = equiv.und_prod_equiv;
      const cantEquiv = equiv.cant_equiv;

      const fila = [
        producto.id_prod,
        producto.nom_prod,
        unidadBase,
        `1 ${unidadBase} = ${cantEquiv} ${unidadEquiv}`,
      ];

      for (const fecha of fechas) {
        const comprasAntes = lotes
          .filter(
            (l) =>
              l.prod_lote?.id_prod === producto.id_prod &&
              l.orig_lote === 'compra' &&
              fechaLocal(new Date(l.crea_en_lote)) < fecha,
          )
          .reduce((sum, l) => sum + Number(l.cant_tot_lote), 0);

        const consumoAntes = transformaciones
          .flatMap((t) =>
            t.rece_trans.ingredientes
              .filter(
                (i) =>
                  i.prod_rec.id_prod === producto.id_prod &&
                  fechaLocal(new Date(t.fecha_trans)) < fecha,
              )
              .map((i) => i.cant_rec * t.cant_prod_trans),
          )
          .reduce((sum, cant) => sum + cant, 0);

        const stockInicial = comprasAntes - consumoAntes;

        const comprasDia = lotes
          .filter(
            (l) =>
              l.prod_lote?.id_prod === producto.id_prod &&
              l.orig_lote === 'compra' &&
              esMismaFecha(fechaLocal(new Date(l.crea_en_lote)), fecha),
          )
          .reduce((sum, l) => sum + Number(l.cant_tot_lote), 0);

        const consumoDia = transformaciones
          .flatMap((t) =>
            t.rece_trans.ingredientes
              .filter(
                (i) =>
                  i.prod_rec.id_prod === producto.id_prod &&
                  esMismaFecha(fechaLocal(new Date(t.fecha_trans)), fecha),
              )
              .map((i) => i.cant_rec * t.cant_prod_trans),
          )
          .reduce((sum, cant) => sum + cant, 0);

        const stockFinal = stockInicial + comprasDia - consumoDia;

        let interpretacion = 'Sin stock';
        if (stockFinal > 0) {
          const cantidad = stockFinal / cantEquiv;
          const enteros = Math.floor(cantidad);
          const decimales = Number((cantidad - enteros).toFixed(2));
          const unidadFracc = unidadBase === 'und' ? unidadEquiv : unidadBase;

          if (unidadBase === 'und') {
            if (enteros > 0 && decimales > 0) {
              interpretacion = `${enteros} ${unidadBase} + ${Math.round(
                decimales * cantEquiv,
              )} ${unidadFracc}`;
            } else if (enteros > 0) {
              interpretacion = `${enteros} ${unidadBase}`;
            } else {
              interpretacion = `${Math.round(decimales * cantEquiv)} ${unidadFracc}`;
            }
          } else {
            if (enteros > 0 && decimales > 0) {
              interpretacion = `${enteros} ${unidadBase} + ${decimales} ${unidadFracc}`;
            } else if (enteros > 0) {
              interpretacion = `${enteros} ${unidadBase}`;
            } else {
              interpretacion = `${decimales} ${unidadFracc}`;
            }
          }
        }

        fila.push(stockFinal, interpretacion);
      }

      body.push(fila);
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
      pageOrientation: 'landscape',
      content: [
        { text: 'REPORTE DE PRODUCTOS INSUMO', style: 'header' },
        {
          columns: [
            {
              text: `Desde: ${desdeDate.toLocaleDateString('es-EC')}`,
              style: 'subheader',
            },
            {
              text: `Hasta: ${hastaDate.toLocaleDateString('es-EC')}`,
              style: 'subheader',
              alignment: 'right',
            },
          ],
        },
        '\n',
        {
          table: {
            headerRows: 1,
            widths: Array(body[0].length).fill('*'),
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
        },
        subheader: {
          fontSize: 10,
          italics: true,
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

  /* async exportarReporteProductosDirectosTransformadosExcel(
    desde?: string,
    hasta?: string,
  ): Promise<Buffer> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Directos y Transformados');

    const azul = '305496';
    const blanco = 'FFFFFF';
    let fila = 1;

    worksheet.mergeCells(`A${fila}:H${fila}`);
    const titulo = worksheet.getCell(`A${fila}`);
    titulo.value = `REPORTE DE PRODUCTOS DIRECTOS Y TRANSFORMADOS`;
    titulo.font = { size: 18, bold: true, color: { argb: azul } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };
    fila += 2;

    const desdeDate = desde ? new Date(`${desde}T00:00:00`) : new Date();
    const hastaDate = hasta ? new Date(`${hasta}T23:59:59`) : new Date();

    worksheet.getCell(`A${fila}`).value =
      `Desde: ${desdeDate.toLocaleDateString('es-EC')}`;
    worksheet.getCell(`B${fila}`).value =
      `Hasta: ${hastaDate.toLocaleDateString('es-EC')}`;
    worksheet.getCell(`A${fila}`).font = { italic: true };
    worksheet.getCell(`B${fila}`).font = { italic: true };
    fila += 2;

    const fechas: Date[] = [];
    for (
      let d = new Date(desdeDate);
      d <= hastaDate;
      d.setDate(d.getDate() + 1)
    ) {
      fechas.push(new Date(d));
    }

    const headers = [
      'ID',
      'Nombre',
      'Tipo',
      'Unidad base',
      ...fechas.map((f) => `Stock ${f.toLocaleDateString('es-EC')}`),
    ];
    worksheet.addRow(headers);
    const encabezado = worksheet.getRow(fila);
    encabezado.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: azul },
      };
      cell.font = { bold: true, color: { argb: blanco } };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    fila++;

    const productos = await this.productosRepository.find();
    const productosFiltrados = productos.filter((p) =>
      ['Directo', 'Transformado'].includes(p.tip_prod),
    );

    const lotes = await this.dataSource
      .getRepository('lotes')
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.prod_lote', 'producto')
      .where('DATE(l.crea_en_lote) <= :hasta', {
        hasta: hastaDate.toISOString().split('T')[0],
      })
      .getMany();

    const ventas = await this.dataSource
      .getRepository('dets_ventas')
      .createQueryBuilder('dv')
      .leftJoinAndSelect('dv.vent_dventa', 'venta')
      .leftJoinAndSelect('dv.prod_dventa', 'producto')
      .where('DATE(venta.fech_vent) BETWEEN :desde AND :hasta', {
        desde: desdeDate.toISOString().split('T')[0],
        hasta: hastaDate.toISOString().split('T')[0],
      })
      .getMany();

    function esMismaFecha(d1: Date, d2: Date): boolean {
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    }

    function esAntesDe(d1: Date, d2: Date): boolean {
      return (
        d1.getFullYear() < d2.getFullYear() ||
        (d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() < d2.getMonth()) ||
        (d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() < d2.getDate())
      );
    }

    for (const producto of productosFiltrados) {
      let stockAcumulado = 0;

      const acumuladoInicial = lotes
        .filter(
          (l) =>
            l.prod_lote?.id_prod === producto.id_prod &&
            esAntesDe(new Date(l.crea_en_lote), fechas[0]) &&
            l.orig_lote ===
              (producto.tip_prod === 'Directo' ? 'compra' : 'transformacion'),
        )
        .reduce((sum, l) => sum + Number(l.cant_tot_lote), 0);

      const ventasIniciales = ventas
        .filter(
          (v) =>
            v.prod_dventa?.id_prod === producto.id_prod &&
            esAntesDe(new Date(v.vent_dventa.fech_vent), fechas[0]),
        )
        .reduce((sum, v) => sum + Number(v.cant_dventa), 0);

      stockAcumulado = acumuladoInicial - ventasIniciales;

      console.log(`\n🟡 Producto: ${producto.nom_prod}`);
      console.log(`Stock acumulado inicial: ${stockAcumulado}`);

      const filaValores = [
        producto.id_prod,
        producto.nom_prod,
        producto.tip_prod,
        producto.und_prod,
      ];

      for (const fecha of fechas) {
        const entradas = lotes
          .filter(
            (l) =>
              l.prod_lote?.id_prod === producto.id_prod &&
              esMismaFecha(new Date(l.crea_en_lote), fecha) &&
              l.orig_lote ===
                (producto.tip_prod === 'Directo' ? 'compra' : 'transformacion'),
          )
          .reduce((sum, l) => sum + Number(l.cant_tot_lote), 0);

        const salidas = ventas
          .filter(
            (v) =>
              v.prod_dventa?.id_prod === producto.id_prod &&
              esMismaFecha(new Date(v.vent_dventa.fech_vent), fecha),
          )
          .reduce((sum, v) => sum + Number(v.cant_dventa), 0);

        stockAcumulado += entradas - salidas;

        console.log(
          `📅 ${fecha.toLocaleDateString('es-EC')} → entradas: ${entradas}, salidas: ${salidas}, stock final: ${stockAcumulado}`,
        );

        filaValores.push(stockAcumulado);
      }

      const row = worksheet.addRow(filaValores);
      row.eachCell((cell) => {
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

    worksheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const value = cell.value;
        const length = value ? value.toString().length : 0;
        if (length > maxLength) maxLength = length;
      });
      column.width = maxLength + 2;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  } */

  async exportarReporteProductosDirectosTransformadosExcel(
    desde?: string,
    hasta?: string,
  ): Promise<Buffer> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Directos y Transformados');

    const azul = '305496';
    const blanco = 'FFFFFF';
    let fila = 1;

    worksheet.mergeCells(`A${fila}:H${fila}`);
    const titulo = worksheet.getCell(`A${fila}`);
    titulo.value = `REPORTE DE PRODUCTOS DIRECTOS Y TRANSFORMADOS`;
    titulo.font = { size: 18, bold: true, color: { argb: azul } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };
    fila += 2;

    const desdeDate = desde ? new Date(`${desde}T00:00:00`) : new Date();
    const hastaDate = hasta ? new Date(`${hasta}T23:59:59`) : new Date();

    worksheet.getCell(`A${fila}`).value =
      `Desde: ${desdeDate.toLocaleDateString('es-EC')}`;
    worksheet.getCell(`B${fila}`).value =
      `Hasta: ${hastaDate.toLocaleDateString('es-EC')}`;
    worksheet.getCell(`A${fila}`).font = { italic: true };
    worksheet.getCell(`B${fila}`).font = { italic: true };
    fila += 2;

    const fechas: Date[] = [];
    for (
      let d = new Date(desdeDate);
      d <= hastaDate;
      d.setDate(d.getDate() + 1)
    ) {
      fechas.push(new Date(d));
    }

    const headers = [
      'ID',
      'Nombre',
      'Tipo',
      'Unidad base',
      'Stock Inicial',
      ...fechas.map((f) => f.toLocaleDateString('es-EC')),
    ];
    worksheet.addRow(headers);
    const encabezado = worksheet.getRow(fila);
    encabezado.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: azul },
      };
      cell.font = { bold: true, color: { argb: blanco } };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    fila++;

    const productos = await this.productosRepository.find();
    const productosFiltrados = productos.filter((p) =>
      ['Directo', 'Transformado'].includes(p.tip_prod),
    );

    const lotes = await this.dataSource
      .getRepository('lotes')
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.prod_lote', 'producto')
      .where('DATE(l.crea_en_lote) <= :hasta', {
        hasta: hastaDate.toISOString().split('T')[0],
      })
      .getMany();

    const ventas = await this.dataSource
      .getRepository('dets_ventas')
      .createQueryBuilder('dv')
      .leftJoinAndSelect('dv.vent_dventa', 'venta')
      .leftJoinAndSelect('dv.prod_dventa', 'producto')
      .where('DATE(venta.fech_vent) BETWEEN :desde AND :hasta', {
        desde: desdeDate.toISOString().split('T')[0],
        hasta: hastaDate.toISOString().split('T')[0],
      })
      .getMany();

    function esMismaFecha(d1: Date, d2: Date): boolean {
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    }

    for (const producto of productosFiltrados) {
      const loteInicial = lotes.find(
        (l) =>
          l.prod_lote?.id_prod === producto.id_prod &&
          l.orig_lote === 'inicial',
      );
      const stockInicial = loteInicial ? Number(loteInicial.cant_tot_lote) : 0;
      let stockAcumulado = stockInicial;

      const filaValores = [
        producto.id_prod,
        producto.nom_prod,
        producto.tip_prod,
        producto.und_prod,
        stockInicial,
      ];

      for (const fecha of fechas) {
        const entradas = lotes
          .filter(
            (l) =>
              l.prod_lote?.id_prod === producto.id_prod &&
              esMismaFecha(new Date(l.crea_en_lote), fecha) &&
              l.orig_lote !== 'inicial', // 🔒 evitar sumar lote inicial
          )
          .reduce((sum, l) => sum + Number(l.cant_tot_lote), 0);

        const salidas = ventas
          .filter(
            (v) =>
              v.prod_dventa?.id_prod === producto.id_prod &&
              esMismaFecha(new Date(v.vent_dventa.fech_vent), fecha),
          )
          .reduce((sum, v) => sum + Number(v.cant_dventa), 0);

        stockAcumulado += entradas - salidas;
        filaValores.push(stockAcumulado);
      }

      const row = worksheet.addRow(filaValores);
      row.eachCell((cell) => {
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

    worksheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const value = cell.value;
        const length = value ? value.toString().length : 0;
        if (length > maxLength) maxLength = length;
      });
      column.width = maxLength + 2;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /* async exportarReporteProductosDirectosTransformadosPDF(
    desde?: string,
    hasta?: string,
  ): Promise<Buffer> {
    const desdeDate = desde ? new Date(`${desde}T00:00:00`) : new Date();
    const hastaDate = hasta ? new Date(`${hasta}T23:59:59`) : new Date();

    const productos = await this.productosRepository.find();
    const productosFiltrados = productos.filter((p) =>
      ['Directo', 'Transformado'].includes(p.tip_prod),
    );

    const lotes = await this.dataSource
      .getRepository('lotes')
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.prod_lote', 'producto')
      .where('DATE(l.crea_en_lote) <= :hasta', {
        hasta: hastaDate.toISOString().split('T')[0],
      })
      .getMany();

    const ventas = await this.dataSource
      .getRepository('dets_ventas')
      .createQueryBuilder('dv')
      .leftJoinAndSelect('dv.vent_dventa', 'venta')
      .leftJoinAndSelect('dv.prod_dventa', 'producto')
      .where('DATE(venta.fech_vent) BETWEEN :desde AND :hasta', {
        desde: desdeDate.toISOString().split('T')[0],
        hasta: hastaDate.toISOString().split('T')[0],
      })
      .getMany();

    const fechas: Date[] = [];
    for (
      let d = new Date(desdeDate);
      d <= hastaDate;
      d.setDate(d.getDate() + 1)
    ) {
      fechas.push(new Date(d));
    }

    function esMismaFecha(d1: Date, d2: Date): boolean {
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    }

    function esAntesDe(d1: Date, d2: Date): boolean {
      return (
        d1.getFullYear() < d2.getFullYear() ||
        (d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() < d2.getMonth()) ||
        (d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() < d2.getDate())
      );
    }

    const body: any[][] = [
      [
        { text: 'ID', bold: true },
        { text: 'Nombre', bold: true },
        { text: 'Tipo', bold: true },
        { text: 'Unidad', bold: true },
        ...fechas.map((f) => ({
          text: f.toLocaleDateString('es-EC'),
          bold: true,
        })),
      ],
    ];

    for (const producto of productosFiltrados) {
      let stockAcumulado = 0;

      const acumuladoInicial = lotes
        .filter(
          (l) =>
            l.prod_lote?.id_prod === producto.id_prod &&
            esAntesDe(new Date(l.crea_en_lote), fechas[0]) &&
            l.orig_lote ===
              (producto.tip_prod === 'Directo' ? 'compra' : 'transformacion'),
        )
        .reduce((sum, l) => sum + Number(l.cant_tot_lote), 0);

      const ventasIniciales = ventas
        .filter(
          (v) =>
            v.prod_dventa?.id_prod === producto.id_prod &&
            esAntesDe(new Date(v.vent_dventa.fech_vent), fechas[0]),
        )
        .reduce((sum, v) => sum + Number(v.cant_dventa), 0);

      stockAcumulado = acumuladoInicial - ventasIniciales;

      const fila = [
        producto.id_prod,
        producto.nom_prod,
        producto.tip_prod,
        producto.und_prod,
      ];

      for (const fecha of fechas) {
        const entradas = lotes
          .filter(
            (l) =>
              l.prod_lote?.id_prod === producto.id_prod &&
              esMismaFecha(new Date(l.crea_en_lote), fecha) &&
              l.orig_lote ===
                (producto.tip_prod === 'Directo' ? 'compra' : 'transformacion'),
          )
          .reduce((sum, l) => sum + Number(l.cant_tot_lote), 0);

        const salidas = ventas
          .filter(
            (v) =>
              v.prod_dventa?.id_prod === producto.id_prod &&
              esMismaFecha(new Date(v.vent_dventa.fech_vent), fecha),
          )
          .reduce((sum, v) => sum + Number(v.cant_dventa), 0);

        stockAcumulado += entradas - salidas;
        fila.push(stockAcumulado);
      }

      body.push(fila);
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
      pageOrientation: 'landscape',
      content: [
        {
          text: 'REPORTE DE PRODUCTOS DIRECTOS Y TRANSFORMADOS',
          style: 'header',
        },
        {
          columns: [
            {
              text: `Desde: ${desdeDate.toLocaleDateString('es-EC')}`,
              style: 'subheader',
            },
            {
              text: `Hasta: ${hastaDate.toLocaleDateString('es-EC')}`,
              style: 'subheader',
              alignment: 'right',
            },
          ],
        },
        '\n',
        {
          table: {
            headerRows: 1,
            widths: Array(body[0].length).fill('*'),
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
        },
        subheader: {
          fontSize: 10,
          italics: true,
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
  } */
  async exportarReporteProductosDirectosTransformadosPDF(
    desde?: string,
    hasta?: string,
  ): Promise<Buffer> {
    const desdeDate = desde ? new Date(`${desde}T00:00:00`) : new Date();
    const hastaDate = hasta ? new Date(`${hasta}T23:59:59`) : new Date();

    const productos = await this.productosRepository.find();
    const productosFiltrados = productos.filter((p) =>
      ['Directo', 'Transformado'].includes(p.tip_prod),
    );

    const lotes = await this.dataSource
      .getRepository('lotes')
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.prod_lote', 'producto')
      .where('DATE(l.crea_en_lote) <= :hasta', {
        hasta: hastaDate.toISOString().split('T')[0],
      })
      .getMany();

    const ventas = await this.dataSource
      .getRepository('dets_ventas')
      .createQueryBuilder('dv')
      .leftJoinAndSelect('dv.vent_dventa', 'venta')
      .leftJoinAndSelect('dv.prod_dventa', 'producto')
      .where('DATE(venta.fech_vent) BETWEEN :desde AND :hasta', {
        desde: desdeDate.toISOString().split('T')[0],
        hasta: hastaDate.toISOString().split('T')[0],
      })
      .getMany();

    const fechas: Date[] = [];
    for (
      let d = new Date(desdeDate);
      d <= hastaDate;
      d.setDate(d.getDate() + 1)
    ) {
      fechas.push(new Date(d));
    }

    function esMismaFecha(d1: Date, d2: Date): boolean {
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    }

    const body: any[][] = [
      [
        { text: 'ID', bold: true },
        { text: 'Nombre', bold: true },
        { text: 'Tipo', bold: true },
        { text: 'Unidad', bold: true },
        { text: 'Stock Inicial', bold: true },
        ...fechas.map((f) => ({
          text: f.toLocaleDateString('es-EC'),
          bold: true,
        })),
      ],
    ];

    for (const producto of productosFiltrados) {
      // Obtener lote inicial específico
      const loteInicial = lotes.find(
        (l) =>
          l.prod_lote?.id_prod === producto.id_prod &&
          l.orig_lote === 'inicial',
      );
      const stockInicial = loteInicial?.cant_tot_lote ?? 0;

      let stockAcumulado = stockInicial;

      const fila = [
        producto.id_prod,
        producto.nom_prod,
        producto.tip_prod,
        producto.und_prod,
        stockInicial,
      ];

      for (const fecha of fechas) {
        // Entradas del día (excluyendo el lote inicial)
        const entradas = lotes
          .filter(
            (l) =>
              l.prod_lote?.id_prod === producto.id_prod &&
              esMismaFecha(new Date(l.crea_en_lote), fecha) &&
              l.orig_lote !== 'inicial', // 🚫 evitar duplicar el stock inicial
          )
          .reduce((sum, l) => sum + Number(l.cant_tot_lote), 0);

        // Salidas del día
        const salidas = ventas
          .filter(
            (v) =>
              v.prod_dventa?.id_prod === producto.id_prod &&
              esMismaFecha(new Date(v.vent_dventa.fech_vent), fecha),
          )
          .reduce((sum, v) => sum + Number(v.cant_dventa), 0);

        stockAcumulado += entradas - salidas;
        fila.push(stockAcumulado);
      }

      body.push(fila);
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
      pageOrientation: 'landscape',
      content: [
        {
          text: 'REPORTE DE PRODUCTOS DIRECTOS Y TRANSFORMADOS',
          style: 'header',
        },
        {
          columns: [
            {
              text: `Desde: ${desdeDate.toLocaleDateString('es-EC')}`,
              style: 'subheader',
            },
            {
              text: `Hasta: ${hastaDate.toLocaleDateString('es-EC')}`,
              style: 'subheader',
              alignment: 'right',
            },
          ],
        },
        '\n',
        {
          table: {
            headerRows: 1,
            widths: Array(body[0].length).fill('*'),
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
        },
        subheader: {
          fontSize: 10,
          italics: true,
        },
      },
      defaultStyle: {
        font: 'Roboto',
      },
    };

    return new Promise((resolve) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Uint8Array[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.end();
    });
  }
}
