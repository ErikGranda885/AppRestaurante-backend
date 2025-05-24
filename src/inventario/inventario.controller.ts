import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { Lote } from 'src/lotes/lote.entity';

@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get('producto/:id')
  async obtenerProductoConStock(@Param('id') id: number) {
    const producto =
      await this.inventarioService.sincronizarYObtenerProducto(id);
    return producto;
  }

  @Get('productos')
  async obtenerTodosConStockActualizado() {
    const productos =
      await this.inventarioService.sincronizarYListarProductos();
    return productos;
  }

  @Post('consumir')
  async consumirPorLote(
    @Body() body: { id_prod: number; cantidad: number },
  ): Promise<
    {
      id_lote: number;
      cantidadConsumida: number;
      cant_usad_lote: number;
      cant_disp_lote: number;
      esta_lote: string;
    }[]
  > {
    const { id_prod, cantidad } = body;

    if (!id_prod || !cantidad || cantidad <= 0) {
      throw new BadRequestException('Datos inválidos para el consumo.');
    }

    return this.inventarioService.consumirProductoPorLote(id_prod, cantidad);
  }

  @Get('caducar')
  async ObtenerProductosPorCaducar() {
    return this.inventarioService.obtenerProductosPorCaducar();
  }

  // Nuevo endpoint para obtener stock por nombre de producto
  @Get('stock')
  async stock(@Query('nombre') nombre: string) {
    const result = await this.inventarioService.obtenerStockPorNombre(nombre);
    return result;
  }
}
