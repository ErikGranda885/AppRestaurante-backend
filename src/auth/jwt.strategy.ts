import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsuariosService } from 'src/usuarios/usuarios.service';

@Injectable()
export class JwtEstrategia extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usuariosService: UsuariosService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    console.log('🧪 JWT_SECRET en estrategia:', secret);

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.token || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    console.log('🧩 payload recibido en validate:', payload);

    const usuario = await this.usuariosService.listarUsuario(payload.id);

    if (!usuario || usuario.esta_usu !== 'Activo') {
      throw new UnauthorizedException('Usuario no autorizado o inactivo');
    }

    return {
      id_usu: usuario.id_usu,
      nom_usu: usuario.nom_usu,
      email_usu: usuario.email_usu,
      img_usu: usuario.img_usu,
      rol_usu: usuario.rol_usu,
      esta_usu: usuario.esta_usu,
    };
  }
}
