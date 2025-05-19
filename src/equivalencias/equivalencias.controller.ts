import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CreateEquivalenciaDto } from './dto/create-equivalencia.dto';
import { UpdateEquivalenciaDto } from './dto/update-equivalencia.dto';
import { EquivalenciaService } from './equivalencias.service';

@Controller('equivalencias')
export class EquivalenciasController {
  constructor(private readonly equivalenciaService: EquivalenciaService) {}

  // Crear equivalencia
  @Post()
  async crearEquivalencia(@Body() createDto: CreateEquivalenciaDto) {
    return await this.equivalenciaService.crearEquivalencia(createDto);
  }

  // Listar todas las equivalencias
  @Get()
  async listarTodas() {
    return await this.equivalenciaService.listarEquivalencias();
  }

  // Listar equivalencias de un producto específico
  @Get('producto/:id_prod')
  async listarPorProducto(@Param('id_prod') id_prod: number) {
    return await this.equivalenciaService.listarPorProducto(Number(id_prod));
  }

  // Obtener equivalencia activa de un producto
  @Get('producto/:id_prod/activa')
  async obtenerEquivalenciaActiva(
    @Param('id_prod', ParseIntPipe) id_prod: number,
  ) {
    return await this.equivalenciaService.obtenerEquivalenciaActiva(id_prod);
  }

  // Obtener una equivalencia específica
  @Get(':id')
  async listarEquivalencia(@Param('id') id: number) {
    return await this.equivalenciaService.listarEquivalencia(Number(id));
  }

  // Actualizar equivalencia
  @Put(':id')
  async actualizarEquivalencia(
    @Param('id') id: number,
    @Body() updateDto: UpdateEquivalenciaDto,
  ) {
    return await this.equivalenciaService.actualizarEquivalencia(
      Number(id),
      updateDto,
    );
  }

  // Eliminar equivalencia
  @Delete(':id')
  async eliminarEquivalencia(@Param('id') id: number) {
    return await this.equivalenciaService.eliminarEquivalencia(Number(id));
  }
}
