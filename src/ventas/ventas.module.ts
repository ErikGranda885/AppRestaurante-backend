import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from './venta.entity';
import { VentasService } from './ventas.service';
import { Usuario } from 'src/usuarios/usuario.entity';
import { Det_Venta } from 'src/dets_ventas/det_venta.entity';
import { Cierre_Dia } from 'src/cierre_dia/cierre_dia.entity';
import { CierreDiaModule } from 'src/cierre_dia/cierre_dia.module';
import { VentasGateway } from 'src/gateways/ventas.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, Usuario, Det_Venta]),
    CierreDiaModule,
  ],
  providers: [VentasService, VentasGateway],
  exports: [VentasService, VentasGateway],
})
export class VentasModule {}
