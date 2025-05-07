import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cierre_Dia } from './cierre_dia.entity';
import { Venta } from 'src/ventas/venta.entity';
import { Gasto } from 'src/gastos/gasto.entity';
import { Compras } from 'src/compras/compras.entity';
import { CierreDiaController } from './cierre_dia.controller';
import { CierreDiaService } from './cierre_dia.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cierre_Dia, Venta, Gasto, Compras])],
  controllers: [CierreDiaController],
  providers: [CierreDiaService],
  exports: [CierreDiaService],
})
export class CierreDiaModule {}
