import { Module } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CategoriasController } from './categorias.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categoria } from './categoria.entity';
import { CategoriasGateway } from 'src/gateways/categorias.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Categoria])],
  providers: [CategoriasService,CategoriasGateway],
  controllers: [CategoriasController],
  exports: [CategoriasService,CategoriasGateway],
})
export class CategoriasModule {}
