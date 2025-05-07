import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpCode,
  Res,
} from '@nestjs/common';

import { Proveedor } from './proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedoresService } from './proveedores.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly servicio: ProveedoresService) {}

  @Post()
  crear(@Body() dto: CreateProveedorDto): Promise<Proveedor> {
    return this.servicio.crearProveedor(dto);
  }
  @Get('plantilla')
  async downloadTemplate(@Res() res: Response) {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Proveedores');

      // Agregar encabezados
      sheet.addRow([
        'nom_prov',
        'email_prov',
        'cont_prov',
        'tel_prov',
        'ruc_prov',
        'direc_prov',
      ]);

      // Fila de ejemplo (se ignora en backend por validación si deseas)
      const ejemplo = sheet.addRow([
        'Ej: Comercial San José',
        'ejemplo@correo.com',
        'Luis Pérez',
        '0999999999',
        '0123456789001',
        'Ambato - Ecuador',
      ]);
      ejemplo.font = { italic: true, color: { argb: 'FF999999' } };

      // Formatear columnas TEL y RUC como texto
      sheet.getColumn(4).numFmt = '@';
      sheet.getColumn(5).numFmt = '@';

      // Ancho de columnas
      sheet.columns.forEach((col) => {
        col.width = 25;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename=\"plantilla-proveedores.xlsx\"',
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

  @Get()
  listar(): Promise<Proveedor[]> {
    return this.servicio.listarProveedores();
  }

  @Get(':id')
  obtener(@Param('id') id: string): Promise<Proveedor> {
    return this.servicio.listarProveedor(+id);
  }

  @Put(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateProveedorDto,
  ): Promise<Proveedor> {
    return this.servicio.actualizarProveedor(+id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id') id: string): Promise<void> {
    return this.servicio.eliminar(+id);
  }

  @Put('inactivar/:id')
  async inactivar(@Param('id') id: number) {
    await this.servicio.inactivarProveedor(+id);
    return { message: 'Proveedor inactivado correctamente' };
  }

  @Put('activar/:id')
  async activar(@Param('id') id: number) {
    await this.servicio.activarProveedor(+id);
    return { message: 'Proveedor activado correctamente' };
  }

  @Post('masivo')
  async crearBulk(@Body() createProveedoresDto: CreateProveedorDto[]) {
    return this.servicio.crearProveedoresMasivo(createProveedoresDto);
  }
}
