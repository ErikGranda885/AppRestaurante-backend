import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Receta } from 'src/recetas/receta.entity';
import { Producto } from 'src/productos/producto.entity';
import { Det_Receta } from './det_receta.entity';
import { DetRecetaController } from './dets_recetas.controller';
import { DetRecetaService } from './dets_recetas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Det_Receta, Receta, Producto])],
  controllers: [DetRecetaController],
  providers: [DetRecetaService],
  exports: [DetRecetaService],
})
export class DetsRecetasModule {}
