import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Det_Venta } from './det_venta.entity';
import { Venta } from 'src/ventas/venta.entity';
import { Producto } from 'src/productos/producto.entity';
import { DetsVentasService } from './dets_ventas.service';
import { DetsVentasController } from './dets_ventas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Det_Venta, Venta, Producto])],
  providers: [DetsVentasService],
  controllers: [DetsVentasController],
  exports: [DetsVentasService],
})
export class DetsVentasModule {}
