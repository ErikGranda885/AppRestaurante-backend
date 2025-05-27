// proveedores.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proveedor } from './proveedor.entity';
import { ProveedoresService } from './proveedores.service';
import { ProveedoresController } from './proveedores.controller';
import { ProveedoresGateway } from 'src/gateways/proveedores.gateway';

@Module({
  imports: [
    // Aquí registramos el repositorio de Proveedor
    TypeOrmModule.forFeature([Proveedor]),
  ],
  providers: [ProveedoresService, ProveedoresGateway],
  controllers: [ProveedoresController],
  exports: [ ProveedoresGateway],
})
export class ProveedoresModule {}
