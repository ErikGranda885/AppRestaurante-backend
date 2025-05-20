import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecetasController } from './recetas.controller';
import { RecetasService } from './recetas.service';
import { Receta } from './receta.entity';
import { Producto } from 'src/productos/producto.entity';
import { Det_Receta } from 'src/dets_recetas/det_receta.entity';
import { Transformacion } from 'src/transformaciones/transformacion.entity'; // ✅ importar entidad

@Module({
  imports: [
    TypeOrmModule.forFeature([Receta, Producto, Det_Receta, Transformacion]),
  ],
  controllers: [RecetasController],
  providers: [RecetasService],
  exports: [RecetasService],
})
export class RecetasModule {}
