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
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginUsuarioDto } from '../usuarios/dto/login-usuario.dto';
import { JwtService } from '@nestjs/jwt';
import { MailService } from 'src/mail/mail.service';
import * as CryptoJS from 'crypto-js';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
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

  @Post('solicitar-restablecimiento')
  async solicitarRestablecimiento(@Body('email') email: string) {
    const user = await this.usuariosService.buscarPorEmail(email); // crea este método si no existe

    if (!user) {
      return { error: 'Correo no registrado' };
    }

    const token = this.jwtService.sign(
      { sub: user.id_usu },
      { expiresIn: '15m' },
    );

    await this.mailService.enviarCorreoRecuperacion(email, token);

    return {
      mensaje: 'Correo enviado con el enlace para restablecer contraseña',
    };
  }

  @Post('restablecer-password')
  @HttpCode(HttpStatus.OK)
  async restablecerPassword(
    @Body('token') token: string,
    @Body('nuevaContrasena') nuevaContrasena: string,
  ) {
    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      console.log('🔑 Contraseña en texto plano:', nuevaContrasena);

      await this.usuariosService.actualizarContrasena(userId, nuevaContrasena);

      return { mensaje: 'Contraseña actualizada correctamente' };
    } catch (err) {
      console.error('❌ Error al verificar token:', err.message);
      throw new BadRequestException('Token inválido o expirado');
    }
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
