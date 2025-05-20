import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Res,
} from '@nestjs/common';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { Gasto } from './gasto.entity';
import { GastosService } from './gastos.service';
import { Response } from 'express';
@Controller('gastos')
export class GastoController {
  constructor(private readonly gastoService: GastosService) {}

  // Crear un nuevo gasto
  @Post()
  async crear(@Body() createGastoDto: CreateGastoDto): Promise<Gasto> {
    return this.gastoService.crearGasto(createGastoDto);
  }

  // Listar todos los gastos
  @Get()
  async listar(): Promise<any[]> {
    return this.gastoService.listarGastos();
  }

  // Exportar gastos en Excel
  @Get('reporte/excel')
  async exportarExcel(@Res() res: Response) {
    try {
      const buffer = await this.gastoService.exportarGastosExcel();
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="reporte-gastos.xlsx"',
      });
      res.send(buffer);
    } catch (error) {
      console.error('Error al exportar gastos (Excel):', error);
      res.status(error.status || 500).json({
        statusCode: error.status || 500,
        message: error.message || 'Error interno al generar el reporte',
      });
    }
  }

  // Exportar gastos en PDF
  @Get('reporte/pdf')
  async exportarPDF(@Res() res: Response) {
    try {
      const buffer = await this.gastoService.exportarGastosPDF();
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="reporte-gastos.pdf"',
      });
      res.send(buffer);
    } catch (error) {
      console.error('Error al exportar gastos (PDF):', error);
      res.status(error.status || 500).json({
        statusCode: error.status || 500,
        message: error.message || 'Error interno al generar el reporte',
      });
    }
  }

  // Obtener un gasto por ID (opcional)

  // Actualizar un gasto
  @Put(':id')
  async actualizar(
    @Param('id') id: number,
    @Body() updateGastoDto: CreateGastoDto,
  ): Promise<Gasto> {
    return this.gastoService.actualizarGasto(id, updateGastoDto);
  }

  // Eliminar un gasto
  @Delete(':id')
  async eliminar(@Param('id') id: number): Promise<void> {
    return this.gastoService.eliminarGasto(id);
  }
}
