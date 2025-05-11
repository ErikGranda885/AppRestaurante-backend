import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracionesService } from './configuraciones.service';
import { ConfiguracionesController } from './configuraciones.controller';
import { Configuracion } from './configuracion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Configuracion])],
  providers: [ConfiguracionesService],
  controllers: [ConfiguracionesController],
})
export class ConfiguracionesModule {}
