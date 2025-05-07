// proveedores.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proveedor } from './proveedor.entity';
import { ProveedoresService } from './proveedores.service';
import { ProveedoresController } from './proveedores.controller';

@Module({
  imports: [
    // Aquí registramos el repositorio de Proveedor
    TypeOrmModule.forFeature([Proveedor]),
  ],
  providers: [ProveedoresService],
  controllers: [ProveedoresController],
})
export class ProveedoresModule {}
