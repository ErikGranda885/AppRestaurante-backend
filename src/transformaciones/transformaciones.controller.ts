import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { TransformacionesService } from './transformaciones.service';
import { CreateTransformacionDto } from './dto/create-transformacion.dto';
import { UpdateTransformacionDto } from './dto/update-transformacion.dto';

@Controller('transformaciones')
export class TransformacionesController {
  constructor(
    private readonly transformacionesService: TransformacionesService,
  ) {}

  // Crear transformación
  @Post()
  async crearTransformacion(@Body() createDto: CreateTransformacionDto) {
    return await this.transformacionesService.crearTransformacion(createDto);
  }

  // Listar todas las transformaciones
  @Get()
  async listarTodas() {
    const transformaciones =
      await this.transformacionesService.listarTransformaciones();
    return {
      message: 'Transformaciones obtenidas correctamente',
      transformaciones,
    };
  }

  // Listar transformaciones por receta
  @Get('receta/:id_rec')
  async listarPorReceta(@Param('id_rec') id_rec: number) {
    const transformaciones = await this.transformacionesService.listarPorReceta(
      Number(id_rec),
    );
    return {
      message: `Transformaciones de la receta ${id_rec} obtenidas correctamente`,
      transformaciones,
    };
  }

  // Obtener una transformación específica
  @Get(':id')
  async listarTransformacion(@Param('id') id: number) {
    const transformacion =
      await this.transformacionesService.listarTransformacion(Number(id));
    return {
      message: 'Transformación obtenida correctamente',
      transformacion,
    };
  }

  // Actualizar transformación (PUT)
  @Put(':id')
  async actualizarTransformacion(
    @Param('id') id: number,
    @Body() updateDto: UpdateTransformacionDto,
  ) {
    return await this.transformacionesService.actualizarTransformacion(
      Number(id),
      updateDto,
    );
  }

  // Eliminar transformación
  @Delete(':id')
  async eliminarTransformacion(@Param('id') id: number) {
    return await this.transformacionesService.eliminarTransformacion(
      Number(id),
    );
  }
}
