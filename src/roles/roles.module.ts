import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from './rol.entity';
import { RolesController } from './roles.controller';
import { RolesGateway } from 'src/gateways/roles.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Rol])],
  providers: [RolesService, RolesGateway],
  controllers: [RolesController],
  exports: [RolesService, RolesGateway],
})
export class RolesModule {}
