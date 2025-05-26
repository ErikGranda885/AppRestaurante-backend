import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Headers,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginUsuarioDto } from '../usuarios/dto/login-usuario.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  // ✅ Devuelve usuario actual desde cookie (JWT guard + validate)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getPerfil(@Request() req) {
    console.log('📥 Entró al endpoint /auth/me');
    return {
      id_usu: req.user.id_usu,
      nom_usu: req.user.nom_usu,
      email_usu: req.user.email_usu,
      img_usu: req.user.img_usu,
      rol_usu: req.user.rol_usu,
      esta_usu: req.user.esta_usu,
    };
  }

  // ✅ Login tradicional con JWT en cookie
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() loginUsuarioDto: LoginUsuarioDto,
  ) {
    const { usuario, token } =
      await this.usuariosService.login(loginUsuarioDto);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60, // 1 hora
    });

    return { message: 'Login exitoso', usuario };
  }

  // ✅ Login con Google (crea o valida el usuario y genera cookie)
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async loginDesdeGoogle(
    @Body() body: { email: string; nombre: string; foto?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { usuario, token } =
      await this.usuariosService.loginDesdeGoogle(body);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60,
    });

    return { message: 'Login exitoso', usuario };
  }

  // ✅ Logout (limpia cookie)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { message: 'Sesión cerrada correctamente' };
  }

  // 🧪 Prueba manual de verificación de token
  @Get('test-token')
  testToken(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    try {
      const decoded = this.jwtService.verify(token);
      console.log('✅ Token decodificado:', decoded);
      return { decoded };
    } catch (err) {
      console.error('❌ Error al verificar token:', err.message);
      return { error: err.message };
    }
  }
}
