import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Put,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { Response } from 'express';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  // Crear una nueva venta
  @Post()
  async crearVenta(@Body() createVentaDto: CreateVentaDto) {
    return await this.ventasService.crearVenta(createVentaDto);
  }

  // Listar todas las ventas
  @Get()
  async listarVentas() {
    return await this.ventasService.listarVentas();
  }

  @Get('listado')
  async listarVentasDetalle() {
    return await this.ventasService.listarVentasConDetalles();
  }

  // GET /ventas/ultimas?limit=5
  @Get('ultimas')
  async obtenerUltimasVentas(@Query('limit') limit: string) {
    const parsedLimit = Number(limit) || 5;
    return await this.ventasService.obtenerUltimasVentas(parsedLimit);
  }

  // GET /ventas/pagos-pendientes
  @Get('pagos-pendientes')
  async obtenerVentasPendientesPorTransferencia() {
    return await this.ventasService.ventasPendientesPorTransferencia();
  }

  // Filtrar ventas por estado
  @Get('/estado/:est_vent')
  async filtrarVentasPorEstado(@Param('est_vent') est_vent: string) {
    return await this.ventasService.filtrarVentasPorEstado(est_vent);
  }

  // Filtrar ventas por fecha
  @Get('/fecha')
  async filtrarVentasPorFecha(@Query('fech_vent') fech_vent: Date) {
    return await this.ventasService.filtrarVentasPorFecha(fech_vent);
  }

  // Filtrar ventas por usuario
  @Get('/usuario/:usu_vent')
  async filtrarVentasPorUsuario(@Param('usu_vent') usu_vent: string) {
    const parsedId = Number(usu_vent);
    if (isNaN(parsedId)) {
      throw new BadRequestException('El ID del usuario no es válido');
    }
    return await this.ventasService.filtrarVentasPorUsuario(parsedId);
  }

  // Actualizar una venta existente
  @Put(':id')
  async actualizarVenta(
    @Param('id') id: string,
    @Body() updateVentaDto: UpdateVentaDto,
  ) {
    const parsedId = Number(id);
    if (isNaN(parsedId)) {
      throw new BadRequestException('El ID de la venta no es válido');
    }
    return await this.ventasService.actualizarVenta(parsedId, updateVentaDto);
  }

  // Actualizar el estado de una venta
  @Put(':id/estado')
  async actualizarEstado(
    @Param('id') id: string,
    @Body() body: UpdateEstadoDto,
  ) {
    const parsedId = Number(id);
    if (isNaN(parsedId)) {
      throw new BadRequestException('El ID de la venta no es válido');
    }

    return await this.ventasService.actualizarEstado(parsedId, body.est_vent);
  }

  // Obtener resumen de ventas por categoría
  @Get('categoria')
  async obtenerVentasPorCategoria() {
    return await this.ventasService.obtenerVentasPorCategoria();
  }

  @Get('periodo')
  async obtenerVentasPorPeriodo(
    @Query('tipo') tipo: 'diario' | 'semanal' | 'mensual',
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    if (!tipo) {
      throw new BadRequestException('El parámetro "tipo" es requerido');
    }
    return this.ventasService.obtenerVentasPorPeriodo(tipo, desde, hasta);
  }

  @Get('reportes/ventas/periodo/excel')
  async exportarVentasExcel(
    @Res() res: Response,
    @Query('tipo') tipo: 'diario' | 'semanal' | 'mensual',
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    if (!tipo) {
      throw new BadRequestException('El parámetro "tipo" es requerido');
    }

    const buffer = await this.ventasService.exportarExcelPorPeriodo(
      tipo,
      desde,
      hasta,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=reporte_ventas_${tipo}.xlsx`,
    });

    res.send(buffer);
  }

  @Get('reportes/ventas/periodo/pdf')
  async exportarVentasPDF(
    @Res() res: Response,
    @Query('tipo') tipo: 'diario' | 'semanal' | 'mensual',
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    if (!tipo) {
      throw new BadRequestException('El parámetro "tipo" es requerido');
    }

    const buffer = await this.ventasService.exportarPDFPorPeriodo(
      tipo,
      desde,
      hasta,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=reporte_ventas_${tipo}.pdf`,
    });

    res.send(buffer);
  }

  // Obtener una venta por su id
  @Get(':id')
  async obtenerVenta(@Param('id') id: string) {
    const parsedId = Number(id);
    if (isNaN(parsedId)) {
      throw new BadRequestException('El ID de la venta no es válido');
    }
    return await this.ventasService.obtenerVenta(parsedId);
  }
}
