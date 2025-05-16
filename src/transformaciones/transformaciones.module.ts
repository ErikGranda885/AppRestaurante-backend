import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransformacionesController } from './transformaciones.controller';
import { TransformacionesService } from './transformaciones.service';
import { Transformacion } from './transformacion.entity';
import { Receta } from 'src/recetas/receta.entity';
import { Usuario } from 'src/usuarios/usuario.entity';
import { Det_Receta } from 'src/dets_recetas/det_receta.entity';
import { Det_Compra } from 'src/dets_compras/det_compra.entity';
import { Producto } from 'src/productos/producto.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transformacion,
      Receta,
      Usuario,
      Det_Receta,
      Det_Compra,
      Producto,
    ]),
  ],
  controllers: [TransformacionesController],
  providers: [TransformacionesService],
  exports: [TransformacionesService],
})
export class TransformacionesModule {}
