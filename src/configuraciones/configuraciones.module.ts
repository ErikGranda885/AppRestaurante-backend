import { Module } from '@nestjs/common';
import { ConfiguracionesService } from './configuraciones.service';
import { ConfiguracionesController } from './configuraciones.controller';

@Module({
  providers: [ConfiguracionesService],
  controllers: [ConfiguracionesController],
})
export class ConfiguracionesModule {}
