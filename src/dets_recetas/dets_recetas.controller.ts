import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { DetRecetaService } from './dets_recetas.service';
import { CreateDetRecetaDto } from './dto/create-det_receta.dto';

@Controller('dets_recetas')
export class DetRecetaController {
  constructor(private readonly detRecetaService: DetRecetaService) {}

  // Listar ingredientes por receta
  @Get('por-receta/:id')
  async listarPorReceta(@Param('id', ParseIntPipe) id: number) {
    return await this.detRecetaService.listarPorReceta(id);
  }

  // Crear ingrediente
  @Post()
  async crear(@Body() dto: CreateDetRecetaDto) {
    return await this.detRecetaService.crear(dto);
  }

  // Eliminar ingrediente
  @Delete(':id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    return await this.detRecetaService.eliminar(id);
  }
}
