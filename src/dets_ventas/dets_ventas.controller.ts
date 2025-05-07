// dets_ventas.controller.ts
import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { DetsVentasService } from './dets_ventas.service';
import { CreateDetVentaDto } from './dto/create-det_venta.dto';
import { UpdateDetVentaDto } from './dto/update-det_venta.dto';

@Controller('dets-ventas')
export class DetsVentasController {
  constructor(private readonly detsVentasService: DetsVentasService) {}

  // Endpoint para crear un detalle de venta
  @Post()
  async crearDetVenta(
    @Body() createDetVentaDto: CreateDetVentaDto,
  ): Promise<{ message: string; detVenta: any }> {
    return await this.detsVentasService.crearDetVenta(createDetVentaDto);
  }

  // Endpoint para obtener un detalle de venta por su id_det
  @Get(':id')
  async obtenerDetVenta(@Param('id') id: string) {
    return await this.detsVentasService.obtenerDetVenta(Number(id));
  }

  // Endpoint para obtener los detalles de venta por el id de la venta
  @Get('/venta/:idVent')
  async obtenerDetVentasPorIdVenta(@Param('idVent') idVent: string) {
    return await this.detsVentasService.obtenerDetVentaPorIdVenta(
      Number(idVent),
    );
  }

  // Endpoint para actualizar un detalle de venta
  @Patch(':id')
  async actualizarDetVenta(
    @Param('id') id: string,
    @Body() updateDetVentaDto: UpdateDetVentaDto,
  ) {
    return await this.detsVentasService.actualizarDetVenta(
      Number(id),
      updateDetVentaDto,
    );
  }
}
