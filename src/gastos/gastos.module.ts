import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gasto } from './gasto.entity';
import { GastoController } from './gastos.controller';
import { GastosService } from './gastos.service';
import { CierreDiaModule } from 'src/cierre_dia/cierre_dia.module';
import { GastosGateway } from 'src/gateways/gastos.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Gasto]), CierreDiaModule],
  controllers: [GastoController],
  providers: [GastosService, GastosGateway],
  exports: [GastosService, GastosGateway],
})
export class GastoModule {}
