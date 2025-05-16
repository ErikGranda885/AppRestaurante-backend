import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { RecetasService } from './recetas.service';
import { CreateRecetaDto } from './dto/create-receta.dto';
import { UpdateRecetaDto } from './dto/update-receta.dto';

@Controller('recetas')
export class RecetasController {
  constructor(private readonly recetasService: RecetasService) {}

  // Crear receta
  @Post()
  async crear(@Body() dto: CreateRecetaDto) {
    return await this.recetasService.crearReceta(dto);
  }

  // Listar todas las recetas
  @Get()
  async listar() {
    return await this.recetasService.listarRecetas();
  }

  // Obtener receta por ID
  @Get(':id')
  async obtener(@Param('id', ParseIntPipe) id: number) {
    return await this.recetasService.obtenerReceta(id);
  }

  // Actualizar receta
  @Put(':id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecetaDto,
  ) {
    return await this.recetasService.actualizarReceta(id, dto);
  }

  // Eliminar receta
  @Delete(':id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    return await this.recetasService.eliminarReceta(id);
  }
}
