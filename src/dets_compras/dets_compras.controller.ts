import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Put,
} from '@nestjs/common';

import { Det_Compra } from './det_compra.entity';
import { DetCompraService } from './dets_compras.service';
import { CreateDetCompraDto } from './dto/create-det_compra.dto';
import { UpdateDetCompraDto } from './dto/update-det_compra.dto';

@Controller('detCompras')
export class DetsComprasController {
  constructor(private readonly detCompraService: DetCompraService) {}

  // GET /dets-compras/:id
  @Get(':id')
  async findAllDetalles(@Param('id') id: string): Promise<Det_Compra[]> {
    return await this.detCompraService.obtenerDetallesCompra(Number(id));
  }

  // POST /dets-compras
  @Post()
  async crear(
    @Body() createDetCompraDto: CreateDetCompraDto,
  ): Promise<Det_Compra> {
    return await this.detCompraService.crearDetalleCompra(createDetCompraDto);
  }

  

  // DELETE /dets-compras/:id
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return await this.detCompraService.eliminarDetalleCompra(+id);
  }
}
