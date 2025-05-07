import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compras } from './compras.entity';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { CierreDiaModule } from 'src/cierre_dia/cierre_dia.module';

@Module({
  imports: [TypeOrmModule.forFeature([Compras]), CierreDiaModule],
  providers: [ComprasService],
  controllers: [ComprasController],
  exports: [ComprasService],
})
export class ComprasModule {}
