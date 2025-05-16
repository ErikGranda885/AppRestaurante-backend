import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Det_Compra } from './det_compra.entity';
import { DetsComprasController } from './dets_compras.controller';
import { DetCompraService } from './dets_compras.service';
import { Producto } from 'src/productos/producto.entity';
import { EquivalenciasModule } from 'src/equivalencias/equivalencias.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Det_Compra, Producto]),
    EquivalenciasModule,
  ],
  controllers: [DetsComprasController],
  providers: [DetCompraService],
  exports: [DetCompraService],
})
export class DetsComprasModule {}
