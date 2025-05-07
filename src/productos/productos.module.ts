import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './producto.entity';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { Categoria } from '../categorias/categoria.entity';
import { CategoriasModule } from 'src/categorias/categorias.module';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, Categoria]),CategoriasModule],
  providers: [ProductosService],
  controllers: [ProductosController],
  exports: [ProductosService],
})
export class ProductosModule {}