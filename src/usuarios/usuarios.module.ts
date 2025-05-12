// usuarios.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Usuario } from './usuario.entity';
import { Rol } from '../roles/rol.entity';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { RolesModule } from 'src/roles/roles.module';
import { ConfiguracionesModule } from 'src/configuraciones/configuraciones.module'; // ✅ importa configuraciones

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Rol]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey', // usa variables de entorno en prod
      signOptions: { expiresIn: '1h' },
    }),
    RolesModule,
    ConfiguracionesModule, // ✅ añade este import para solucionar el error
  ],
  providers: [UsuariosService],
  controllers: [UsuariosController],
  exports: [UsuariosService],
})
export class UsuariosModule {}
