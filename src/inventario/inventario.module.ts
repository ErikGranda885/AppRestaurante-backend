import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioService } from './inventario.service';
import { Det_Compra } from 'src/dets_compras/det_compra.entity';
import { Producto } from 'src/productos/producto.entity';
import { InventarioController } from './inventario.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Det_Compra,Producto])],
  providers: [InventarioService],
  exports: [InventarioService],
  controllers: [InventarioController],
})
export class InventarioModule {}
