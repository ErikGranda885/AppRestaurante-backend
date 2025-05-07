import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
} from '@nestjs/common';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { Gasto } from './gasto.entity';
import { GastosService } from './gastos.service';

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
