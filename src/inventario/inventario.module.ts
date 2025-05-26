import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioService } from './inventario.service';
import { Det_Compra } from 'src/dets_compras/det_compra.entity';
import { Producto } from 'src/productos/producto.entity';
import { InventarioController } from './inventario.controller';
import { LotesModule } from 'src/lotes/lotes.module'; // 👈 importar módulo de lotes
import { ProductosGateway } from 'src/gateways/productos.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Det_Compra, Producto]),
    LotesModule, // 👈 importante
  ],
  providers: [InventarioService, ProductosGateway],
  exports: [InventarioService, ProductosGateway],
  controllers: [InventarioController],
})
export class InventarioModule {}
