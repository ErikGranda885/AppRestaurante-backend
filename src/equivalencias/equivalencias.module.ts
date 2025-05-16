import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equivalencia } from './equivalencia.entity';
import { EquivalenciasController } from './equivalencias.controller';
import { Producto } from 'src/productos/producto.entity';
import { EquivalenciaService } from './equivalencias.service';

@Module({
  imports: [TypeOrmModule.forFeature([Equivalencia, Producto])],
  controllers: [EquivalenciasController],
  providers: [EquivalenciaService],
  exports: [EquivalenciaService],
})
export class EquivalenciasModule {}
