import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseIntPipe,
} from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';
import { Compras } from './compras.entity';

@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  // GET /compras
  @Get()
  async listar(): Promise<Compras[]> {
    return await this.comprasService.obtenerCompras();
  }

  // GET /compras/:id
  @Get(':id')
  async listarUna(@Param('id') id: string): Promise<Compras> {
    return await this.comprasService.obtenerCompra(+id);
  }

  // POST /compras
  @Post()
  async crear(@Body() createCompraDto: CreateCompraDto): Promise<Compras> {
    return await this.comprasService.crearCompra(createCompraDto);
  }

  // PATCH /compras/:id
  @Put(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() updateCompraDto: UpdateCompraDto,
  ): Promise<Compras> {
    return await this.comprasService.actualizarCompra(+id, updateCompraDto);
  }

  // ✅ Nuevo endpoint: registrar pago
  @Put('registrar-pago/:id')
  async registrarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    datosPago: {
      numeroComprobante?: string;
      observacion?: string;
      urlComprobante?: string;
    },
  ) {
    return await this.comprasService.registrarPagoCompra(id, datosPago);
  }

  // DELETE /compras/:id
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return await this.comprasService.remove(+id);
  }
}
