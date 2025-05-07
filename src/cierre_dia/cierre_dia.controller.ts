import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateCierreDiarioDto } from './dto/create-cierreDiario.dto';
import { Cierre_Dia } from './cierre_dia.entity';
import { CierreDiaService } from './cierre_dia.service';
import { FiltroCierreDto } from './dto/filtro-cierre.dto';

@Controller('cierres')
export class CierreDiaController {
  constructor(private readonly cierreDiaService: CierreDiaService) {}

  // Crear manualmente un cierre
  @Post()
  async crear(
    @Body() createCierreDto: CreateCierreDiarioDto,
  ): Promise<Cierre_Dia> {
    return await this.cierreDiaService.crearCierre(createCierreDto);
  }

  // Registrar depósito y cerrar
  @Patch(':id/deposito')
  async registrarDeposito(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { tot_dep_cier: number; comp_dep_cier: string },
  ) {
    return this.cierreDiaService.registrarDepositoYCerrar(id, {
      ...body,
      esta_cier: 'cerrado',
    });
  }

 
  @Get()
  async listar(@Query() filtro: FiltroCierreDto): Promise<Cierre_Dia[]> {
    return this.cierreDiaService.listarTodosCierres(filtro);
  }

  // Listar cierres con estado 'por cerrar'
  @Get('por-cerrar')
  listarPorCerrar(@Query() filtro: FiltroCierreDto) {
    return this.cierreDiaService.listarCierresPorCerrar(filtro);
  }

  // Obtener resumen general del día
  @Get('resumen/:fecha')
  async obtenerResumen(@Param('fecha') fecha: string) {
    return await this.cierreDiaService.obtenerResumenDelDia(fecha);
  }

  // Obtener movimientos detallados (ventas, gastos, compras) del día
  @Get('movimientos/:fecha')
  async obtenerMovimientosDelDia(@Param('fecha') fecha: string) {
    return this.cierreDiaService.obtenerMovimientosDelDia(fecha);
  }

  // Obtener un cierre por ID
  @Get(':id')
  async buscarPorId(@Param('id') id: number): Promise<Cierre_Dia> {
    return await this.cierreDiaService.buscarCierrePorId(id);
  }

  // Eliminar un cierre por ID
  @Delete(':id')
  async eliminar(@Param('id') id: number): Promise<void> {
    return await this.cierreDiaService.eliminarCierre(id);
  }
}
