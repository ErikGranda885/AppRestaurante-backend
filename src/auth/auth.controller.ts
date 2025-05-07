import { Controller, Post, Body } from '@nestjs/common';
import { LoginUsuarioDto } from 'src/usuarios/dto/login-usuario.dto';
import { UsuariosService } from 'src/usuarios/usuarios.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post('login')
  async login(@Body() loginUsuarioDto: LoginUsuarioDto) {
    return await this.usuariosService.login(loginUsuarioDto);
  }
}
