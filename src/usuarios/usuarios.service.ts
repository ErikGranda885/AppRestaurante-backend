import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Usuario } from './usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Rol } from '../roles/rol.entity';
import * as CryptoJS from 'crypto-js';
import { JwtService } from '@nestjs/jwt';
import { LoginUsuarioDto } from './dto/login-usuario.dto';
import { ConfiguracionesService } from 'src/configuraciones/configuraciones.service';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Rol)
    private rolRepository: Repository<Rol>,
    private dataSource: DataSource,
    private jwtService: JwtService,
    private configuracionesService: ConfiguracionesService,
  ) {}
  async crearUsuariosMasivo(
    createUsuariosDto: CreateUsuarioDto[],
  ): Promise<{ usuarios: Usuario[]; errors: any[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const usuariosCreados: Usuario[] = [];
    try {
      const secretKey = process.env.AES_SECRET_KEY;
      for (const dto of createUsuariosDto) {
        const { rol_usu, clave_usu, ...userData } = dto;

        const usuarioExistente = await queryRunner.manager.findOne(Usuario, {
          where: { email_usu: userData.email_usu },
        });
        if (usuarioExistente) {
          throw new BadRequestException(
            `El correo ${userData.email_usu} ya está registrado`,
          );
        }

        const rol = await queryRunner.manager.findOne(Rol, {
          where: { id_rol: rol_usu },
        });
        if (!rol) {
          throw new NotFoundException(
            `El rol con id ${rol_usu} no fue encontrado`,
          );
        }

        // Encriptar la contraseña
        const encryptedPassword = CryptoJS.AES.encrypt(
          clave_usu,
          secretKey,
        ).toString();

        const usuario = this.usuarioRepository.create({
          ...userData,
          clave_usu: encryptedPassword,
          rol_usu: rol,
        });
        const usuarioGuardado = await queryRunner.manager.save(usuario);
        usuariosCreados.push(usuarioGuardado);
      }
      await queryRunner.commitTransaction();
      return { usuarios: usuariosCreados, errors: [] };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  async crearUsuario(createUsuarioDto: CreateUsuarioDto): Promise<{
    message: string;
    usuario: Usuario;
  }> {
    const { rol_usu, clave_usu, ...userData } = createUsuarioDto;

    const usuarioExistente = await this.usuarioRepository.findOne({
      where: { email_usu: userData.email_usu },
    });
    if (usuarioExistente) {
      throw new BadRequestException(
        `El correo ${userData.email_usu} ya está registrado`,
      );
    }
    const rol = await this.rolRepository.findOne({
      where: { id_rol: rol_usu },
    });
    if (!rol) {
      throw new NotFoundException(`El rol con id ${rol_usu} no fue encontrado`);
    }

    const secretKey = process.env.AES_SECRET_KEY;
    const encryptedPassword = CryptoJS.AES.encrypt(
      clave_usu,
      secretKey,
    ).toString();

    const usuario = this.usuarioRepository.create({
      ...userData,
      clave_usu: encryptedPassword,
      rol_usu: rol,
    });

    const usuarioGuardado = await this.usuarioRepository.save(usuario);
    return {
      message: 'Usuario creado correctamente',
      usuario: usuarioGuardado,
    };
  }

  async listarUsuarios(): Promise<Usuario[]> {
    return this.usuarioRepository.find();
  }

  async listarUsuario(id: number): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usu: id },
    });
    if (!usuario) {
      throw new NotFoundException(`El usuario con id: ${id} no fue encontrado`);
    }
    return usuario;
  }

  async actualizarUsuario(
    id: number,
    updateUsuarioDto: UpdateUsuarioDto,
  ): Promise<{ message: string; usuario: Usuario }> {
    const usuario = await this.listarUsuario(id);

    if (updateUsuarioDto.rol_usu) {
      const rol = await this.rolRepository.findOne({
        where: { id_rol: updateUsuarioDto.rol_usu },
      });
      if (!rol) {
        throw new NotFoundException(
          `El usuario con rol: ${updateUsuarioDto.rol_usu} no fue encontrado`,
        );
      }
      usuario.rol_usu = rol;
    }

    // Si se envía la nueva contraseña, se encripta antes de asignarla
    if (updateUsuarioDto.clave_usu) {
      const secretKey = process.env.AES_SECRET_KEY;
      updateUsuarioDto.clave_usu = CryptoJS.AES.encrypt(
        updateUsuarioDto.clave_usu,
        secretKey,
      ).toString();
    }

    // Asigna el resto de los campos del DTO al usuario
    Object.assign(usuario, updateUsuarioDto);
    const usuarioActualizado = await this.usuarioRepository.save(usuario);

    return {
      message: 'Usuario actualizado correctamente',
      usuario: usuarioActualizado,
    };
  }

  async inactivarUsuario(
    id: number,
    updateUsuarioDto?: UpdateUsuarioDto,
  ): Promise<{ message: string; usuario: Usuario }> {
    const usuario = await this.listarUsuario(id);
    usuario.esta_usu = 'Inactivo';
    if (updateUsuarioDto) {
      if ('esta_usu' in updateUsuarioDto) {
        delete updateUsuarioDto.esta_usu;
      }
      Object.assign(usuario, updateUsuarioDto);
    }

    const usuarioInactivado = await this.usuarioRepository.save(usuario);

    return {
      message: 'Usuario inactivado correctamente',
      usuario: usuarioInactivado,
    };
  }
  async activarUsuario(
    id: number,
    updateUsuarioDto?: UpdateUsuarioDto,
  ): Promise<{ message: string; usuario: Usuario }> {
    const usuario = await this.listarUsuario(id);
    usuario.esta_usu = 'Activo';

    if (updateUsuarioDto) {
      if ('esta_usu' in updateUsuarioDto) {
        delete updateUsuarioDto.esta_usu;
      }
      Object.assign(usuario, updateUsuarioDto);
    }

    const usuarioActivado = await this.usuarioRepository.save(usuario);

    return {
      message: 'Usuario activado correctamente',
      usuario: usuarioActivado,
    };
  }
  async correoRegistrado(email: string): Promise<boolean> {
    const usuario = await this.usuarioRepository.findOne({
      where: { email_usu: email },
    });
    return !!usuario;
  }
  async login(
    loginUsuarioDto: LoginUsuarioDto,
  ): Promise<{ message: string; usuario: Usuario; token: string }> {
    const { email_usu, clave_usu } = loginUsuarioDto;

    const usuario = await this.usuarioRepository.findOne({
      where: { email_usu },
    });

    if (!usuario) {
      throw new NotFoundException(
        `Usuario con correo ${email_usu} no encontrado`,
      );
    }

    // ✅ Seguridad: bloquear usuario si excedió intentos
    const bloquear =
      (await this.configuracionesService.obtenerValorPorClave(
        'bloquear_usuario_por_intentos',
      )) === 'true';
    const maxIntentos = parseInt(
      (await this.configuracionesService.obtenerValorPorClave(
        'max_intentos_login',
      )) ?? '5',
      10,
    );

    if (usuario.esta_usu === 'Inactivo') {
      throw new UnauthorizedException('Usuario bloqueado o inactivo');
    }

    const secretKey = process.env.AES_SECRET_KEY;
    const bytes = CryptoJS.AES.decrypt(usuario.clave_usu, secretKey);
    const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);

    if (decryptedPassword !== clave_usu) {
      if (bloquear) {
        usuario.intentos_login = (usuario.intentos_login ?? 0) + 1;
        if (usuario.intentos_login >= maxIntentos) {
          usuario.esta_usu = 'Inactivo';
        }
        await this.usuarioRepository.save(usuario);
      }
      throw new BadRequestException('Contraseña incorrecta');
    }

    // ✅ Si login exitoso: reiniciar contador de intentos
    usuario.intentos_login = 0;
    await this.usuarioRepository.save(usuario);

    const payload = { id: usuario.id_usu, email: usuario.email_usu };
    const token = this.jwtService.sign(payload);

    return { message: 'Login exitoso', usuario, token };
  }

  async loginDesdeGoogle(body: {
    email: string;
    nombre: string;
    foto?: string;
  }): Promise<{ usuario: Usuario; token: string }> {
    const permitirGoogle =
      (await this.configuracionesService.obtenerValorPorClave(
        'activar_google_login',
      )) === 'true';
    if (!permitirGoogle) {
      throw new UnauthorizedException('Inicio con Google deshabilitado');
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { email_usu: body.email },
      relations: ['rol_usu'],
    });

    // ✅ CAMBIO: si no existe, NO permitir acceso
    if (!usuario) {
      throw new UnauthorizedException(
        `El usuario ${body.email} no está registrado en el sistema.`,
      );
    }

    // ✅ Opcional: actualizar foto si quieres
    if (body.foto && usuario.img_usu !== body.foto) {
      usuario.img_usu = body.foto;
      await this.usuarioRepository.save(usuario);
    }

    const payload = { id: usuario.id_usu, email: usuario.email_usu };
    const token = this.jwtService.sign(payload);

    return { usuario, token };
  }

  async crearUsuarioSistemaSiNoExiste(): Promise<void> {
    const rolNombre = 'sistema';
    const correo = 'sistema@local.com';
    const clave = 'sistema123';

    let rol = await this.rolRepository.findOne({
      where: { nom_rol: rolNombre },
    });

    if (!rol) {
      rol = this.rolRepository.create({
        nom_rol: rolNombre,
        desc_rol: 'Rol interno del sistema',
        est_rol: 'Activo',
      });
      await this.rolRepository.save(rol);
    }

    const existeUsuario = await this.usuarioRepository.findOne({
      where: { id_usu: 1 },
    });

    if (existeUsuario) return;

    const encryptedPassword = CryptoJS.AES.encrypt(
      clave,
      process.env.AES_SECRET_KEY,
    ).toString();

    const usuario = this.usuarioRepository.create({
      id_usu: 1,
      nom_usu: 'Sistema',
      email_usu: correo,
      clave_usu: encryptedPassword,
      rol_usu: rol,
      esta_usu: 'Activo',
      img_usu:
        'https://firebasestorage.googleapis.com/v0/b/dicolaic-app.appspot.com/o/usuarios%2Fuser-default.webp?alt=media&token=14f267c3-c208-4f2a-88cd-e828147b5f94',
    });

    await this.usuarioRepository.save(usuario);
  }
}
