import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './producto.entity';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { Categoria } from '../categorias/categoria.entity';
import { CategoriasModule } from 'src/categorias/categorias.module';
import { ProductosGateway } from 'src/gateways/productos.gateway';
import { LotesModule } from 'src/lotes/lotes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Producto, Categoria]),
    CategoriasModule,
    LotesModule,
  ],
  providers: [ProductosService, ProductosGateway],
  controllers: [ProductosController],
  exports: [ProductosService, ProductosGateway],
})
export class ProductosModule {}
