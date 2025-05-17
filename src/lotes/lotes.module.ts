import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LotesService } from './lotes.service';
import { LotesController } from './lotes.controller';
import { Lote } from './lote.entity';
import { Producto } from 'src/productos/producto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lote, Producto])],
  controllers: [LotesController],
  providers: [LotesService],
  exports: [LotesService, TypeOrmModule],
})
export class LotesModule {}
