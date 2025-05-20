import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';
import { Compras } from './compras.entity';
import { Response } from 'express';
@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  // GET /compras
  @Get()
  async listar(): Promise<Compras[]> {
    return await this.comprasService.obtenerCompras();
  }

  @Get('reporte/excel')
  async exportarExcel(@Res() res: Response) {
    try {
      const buffer = await this.comprasService.exportarComprasExcel();

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="reporte-compras.xlsx"',
      });

      res.send(buffer);
    } catch (error) {
      console.error('Error al exportar compras (Excel):', error);
      res.status(error.status || 500).json({
        statusCode: error.status || 500,
        message: error.message || 'Error interno al generar el reporte',
      });
    }
  }

  @Get('reporte/pdf')
  async exportarPDF(@Res() res: Response) {
    try {
      const buffer = await this.comprasService.exportarComprasPDF();

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="reporte-compras.pdf"',
      });
      res.send(buffer);
    } catch (error) {
      console.error('Error al exportar compras (PDF):', error);
      res.status(error.status || 500).json({
        statusCode: error.status || 500,
        message: error.message || 'Error interno al generar el reporte PDF',
      });
    }
  }

  // GET /compras/:id
  @Get(':id')
  async listarUna(@Param('id') id: string): Promise<Compras> {
    return await this.comprasService.obtenerCompra(+id);
  }

  // POST /compras
  @Post()
  async crear(@Body() createCompraDto: CreateCompraDto): Promise<Compras> {
    return await this.comprasService.crearCompra(createCompraDto);
  }

  // PATCH /compras/:id
  @Put(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() updateCompraDto: UpdateCompraDto,
  ): Promise<Compras> {
    return await this.comprasService.actualizarCompra(+id, updateCompraDto);
  }

  // ✅ Nuevo endpoint: registrar pago
  @Put('registrar-pago/:id')
  async registrarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    datosPago: {
      numeroComprobante?: string;
      observacion?: string;
      urlComprobante?: string;
    },
  ) {
    return await this.comprasService.registrarPagoCompra(id, datosPago);
  }

  // DELETE /compras/:id
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return await this.comprasService.remove(+id);
  }
}
