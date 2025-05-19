import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}
  @Get('plantilla')
  async downloadTemplate(@Res() res: Response) {
    try {
      const workbook = new ExcelJS.Workbook();
      const mainSheet = workbook.addWorksheet('Categorías');

      // Encabezados
      mainSheet.addRow(['nom_cate', 'desc_cate']);

      // Fila de ejemplo visual (no debe procesarse)
      const ejemplo = mainSheet.addRow([
        'Ej: Bebidas frías',
        'Categoría para productos como gaseosas o jugos',
      ]);
      ejemplo.font = { italic: true, color: { argb: 'FF999999' } };

      // Ajuste opcional de anchos
      mainSheet.columns.forEach((col) => {
        col.width = 35;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="plantilla-categorias.xlsx"',
      });
      res.send(buffer);
    } catch (error) {
      console.error('Error en downloadTemplate:', error);
      res.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  @Post()
  crear(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriasService.crearCategoria(createCategoriaDto);
  }

  @Get()
  listar() {
    return this.categoriasService.listarCategorias();
  }

  @Get('verificar')
  async verificarNombre(@Query('nombre') nombre: string) {
    const exists = await this.categoriasService.categoriaRegistrada(nombre);
    return { exists };
  }

  @Get('exportar-excel')
  async exportarExcel(@Res() res: Response) {
    try {
      const buffer = await this.categoriasService.exportarCategoriasExcel();

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="reporte-categorias.xlsx"',
      });
      res.send(buffer);
    } catch (error) {
      console.error('Error al exportar categorías (Excel):', error);
      res.status(error.status || 500).json({
        statusCode: error.status || 500,
        message: error.message || 'Error interno al generar el reporte',
      });
    }
  }

  // Este es el nuevo método para el PDF
  @Get('exportar-pdf')
  async exportarPDF(@Res() res: Response) {
    try {
      const buffer = await this.categoriasService.exportarCategoriasPDF();

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="reporte-categorias.pdf"',
      });
      res.send(buffer);
    } catch (error) {
      console.error('Error al exportar categorías (PDF):', error);
      res.status(error.status || 500).json({
        statusCode: error.status || 500,
        message: error.message || 'Error interno al generar el reporte PDF',
      });
    }
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.categoriasService.obtenerCategoria(+id);
  }

  @Put(':id')
  actualizar(
    @Param('id') id: string,
    @Body() updateCategoriaDto: UpdateCategoriaDto,
  ) {
    return this.categoriasService.actualizarCategoria(+id, updateCategoriaDto);
  }

  @Put('/inactivar/:id')
  inactivar(@Param('id') id: string) {
    return this.categoriasService.inactivarCategoria(+id);
  }
  @Put('/activar/:id')
  async activar(
    @Param('id') id: string,
    @Body() UpdateCategoriaDto: UpdateCategoriaDto,
  ) {
    return await this.categoriasService.activarCategoria(
      +id,
      UpdateCategoriaDto,
    );
  }

  @Post('masivo')
  async crearBulk(@Body() createCategoryDto: CreateCategoriaDto[]) {
    return this.categoriasService.crearCategoriasMasivo(createCategoryDto);
  }
}
