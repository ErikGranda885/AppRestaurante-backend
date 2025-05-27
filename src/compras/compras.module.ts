import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compras } from './compras.entity';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { CierreDiaModule } from 'src/cierre_dia/cierre_dia.module';
import { ComprasGateway } from 'src/gateways/compras.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Compras]), CierreDiaModule],
  providers: [ComprasService,ComprasGateway],
  controllers: [ComprasController],
  exports: [ComprasService,ComprasGateway],
})
export class ComprasModule {}
