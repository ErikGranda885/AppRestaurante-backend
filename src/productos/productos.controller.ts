import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Res,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { CategoriasService } from 'src/categorias/categorias.service';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './producto.entity';

@Controller('productos')
export class ProductosController {
  constructor(
    private readonly productosService: ProductosService,
    private readonly categoriasService: CategoriasService,
  ) {}

  @Get('populares')
  async obtenerPopulares() {
    return this.productosService.obtenerProductosPopulares();
  }
  @Get('categoria/:idCategoria')
  buscarPorCategoria(@Param('idCategoria') idCategoria: string) {
    return this.productosService.buscarPorCategoria(+idCategoria);
  }

  @Get('verificar')
  async verificarNombre(@Query('nombre') nombre: string) {
    const exists = await this.productosService.productoRegistrado(nombre);
    return { exists };
  }
  @Get()
  listarProductos() {
    return this.productosService.listarProductos();
  }

  @Post()
  crearProducto(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.crearProducto(createProductoDto);
  }
  @Put(':id')
  async actualizarProducto(
    @Param('id') id: string,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return await this.productosService.actualizarProducto(
      +id,
      updateProductoDto,
    );
  }
  @Put('/inactivar/:id')
  async inactivar(
    @Param('id') id: string,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return await this.productosService.inactivarProducto(
      +id,
      updateProductoDto,
    );
  }
  @Put('/activar/:id')
  async activar(
    @Param('id') id: string,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return await this.productosService.activarProducto(+id, updateProductoDto);
  }

  /* @Get('reporte-equivalencias')
  async exportarEquivalencias(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Res() res: Response,
  ) {
    try {
      const buffer =
        await this.productosService.exportarReporteProductosConEquivalenciaExcel(
          desde,
          hasta,
        );

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="reporte-equivalencias.xlsx"',
      });

      res.send(buffer);
    } catch (error) {
      console.error('Error al exportar el reporte de equivalencias:', error);
      res.status(500).json({
        statusCode: 500,
        message: 'Error interno al generar el reporte',
        error: error.message,
      });
    }
  } */

  @Get('reporte-insumos')
  async exportarReporteInsumos(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Res() res: Response,
  ) {
    try {
      const buffer =
        await this.productosService.exportarReporteProductosInsumoExcel(
          desde,
          hasta,
        );
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="reporte-insumos.xlsx"',
      });
      res.send(buffer);
    } catch (error) {
      console.error('Error al exportar reporte de insumos:', error);

      if (error.status === 404) {
        res.status(404).json({
          statusCode: 404,
          message: error.message,
        });
      } else {
        res.status(500).json({
          statusCode: 500,
          message: 'Error interno al generar el reporte de insumos',
          error: error.message,
        });
      }
    }
  }

  @Get('reporte-insumos/pdf')
  async exportarReporteInsumosPDF(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Res() res: Response,
  ) {
    try {
      const buffer =
        await this.productosService.exportarReporteProductosInsumoPDF(
          desde,
          hasta,
        );

      const nombreArchivo = `reporte_insumos_${desde || 'inicio'}_${
        hasta || 'hoy'
      }.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      });

      res.send(buffer);
    } catch (error) {
      console.error('Error al exportar reporte PDF de insumos:', error);

      if (error.status === 404) {
        res.status(404).json({
          statusCode: 404,
          message: error.message,
        });
      } else {
        res.status(500).json({
          statusCode: 500,
          message: 'Error interno al generar el PDF de insumos',
          error: error.message,
        });
      }
    }
  }

  @Get('reporte-directos-transformados')
  async exportarReporteDirectosTransformados(
    @Res() res: Response,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    try {
      const buffer =
        await this.productosService.exportarReporteProductosDirectosTransformadosExcel(
          desde,
          hasta,
        );

      const fechaInicio = desde || 'inicio';
      const fechaFin = hasta || 'hoy';
      const nombreArchivo = `reporte_directos_transformados_${fechaInicio}_${fechaFin}.xlsx`;

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      });
      res.send(buffer);
    } catch (error) {
      console.error(
        'Error al exportar reporte de directos/transformados:',
        error,
      );

      if (error.status === 404) {
        res.status(404).json({
          statusCode: 404,
          message: error.message,
        });
      } else {
        res.status(500).json({
          statusCode: 500,
          message:
            'Error interno al generar el reporte de directos y transformados',
          error: error.message,
        });
      }
    }
  }

  @Get('reporte-directos-transformados/pdf')
  async exportarReporteDirectosTransformadosPDF(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Res() res: Response,
  ) {
    try {
      const buffer =
        await this.productosService.exportarReporteProductosDirectosTransformadosPDF(
          desde,
          hasta,
        );

      const fechaInicio = desde || 'inicio';
      const fechaFin = hasta || 'hoy';
      const nombreArchivo = `reporte_directos_transformados_${fechaInicio}_${fechaFin}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      });
      res.send(buffer);
    } catch (error) {
      console.error('Error al exportar PDF de directos/transformados:', error);

      if (error.status === 404) {
        res.status(404).json({
          statusCode: 404,
          message: error.message,
        });
      } else {
        res.status(500).json({
          statusCode: 500,
          message:
            'Error interno al generar el PDF de directos y transformados',
          error: error.message,
        });
      }
    }
  }

  @Get('plantilla')
  async downloadTemplateProductos(@Res() res: Response) {
    try {
      const categorias = await this.categoriasService.categoriasActivas();

      // Define listas estáticas para tipos y unidades (puedes cargarlas desde base si lo prefieres)
      const tipos = ['Insumo', 'Transformado', 'Directo', 'Combo'];
      const unidades = ['qq', 'kg', 'und', 'lb', 'g'];

      // Crear workbook y hojas
      const workbook = new ExcelJS.Workbook();
      const mainSheet = workbook.addWorksheet('Productos');
      const cateSheet = workbook.addWorksheet('Categorias');
      const tiposSheet = workbook.addWorksheet('Tipos');
      const unidadesSheet = workbook.addWorksheet('Unidades');

      // ---------------- Hoja: Categorías ----------------
      cateSheet.addRow(['ID', 'Categoría']);
      categorias.forEach((cate) => {
        cateSheet.addRow([cate.id_cate, cate.nom_cate]);
      });
      cateSheet.state = 'veryHidden';

      // ---------------- Hoja: Tipos ----------------
      tiposSheet.addRow(['Tipo']);
      tipos.forEach((tipo) => tiposSheet.addRow([tipo]));
      tiposSheet.state = 'veryHidden';

      // ---------------- Hoja: Unidades ----------------
      unidadesSheet.addRow(['Unidad']);
      unidades.forEach((unidad) => unidadesSheet.addRow([unidad]));
      unidadesSheet.state = 'veryHidden';

      // ---------------- Hoja Principal: Productos ----------------
      mainSheet.addRow(['cate_prod', 'nom_prod', 'tip_prod', 'und_prod']);
      mainSheet.addRow([
        'Ej: Bebidas frías',
        'Coca-Cola lata 355ml',
        'Insumo',
        'und',
      ]);

      for (let i = 3; i <= 102; i++) {
        // Validación: Categorías (columna A)
        mainSheet.getCell(`A${i}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`=Categorias!$B$2:$B$${categorias.length + 1}`],
          showErrorMessage: true,
          error: 'Seleccione una categoría válida.',
        };

        // Validación: Tipos (columna C)
        mainSheet.getCell(`C${i}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`=Tipos!$A$2:$A$${tipos.length + 1}`],
          showErrorMessage: true,
          error: 'Seleccione un tipo válido.',
        };

        // Validación: Unidades (columna D)
        mainSheet.getCell(`D${i}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`=Unidades!$A$2:$A$${unidades.length + 1}`],
          showErrorMessage: true,
          error: 'Seleccione una unidad válida.',
        };
      }

      // Enviar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="plantilla-productos.xlsx"',
      });
      res.send(buffer);
    } catch (error) {
      console.error('Error al generar plantilla:', error);
      res.status(500).json({
        statusCode: 500,
        message: 'Error interno al generar la plantilla',
        error: error.message,
      });
    }
  }

  @Post('masivo')
  async crearBulk(@Body() createProductosDto: CreateProductoDto[]) {
    return this.productosService.crearProductosMasivo(createProductosDto);
  }
  @Get(':id')
  async listarProducto(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Producto> {
    return this.productosService.listarProducto(id);
  }
}
