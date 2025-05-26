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
import { Workbook } from 'exceljs';
import * as PdfPrinter from 'pdfmake';
import { writeFile } from 'fs/promises';
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
      relations: ['rol_usu'], // ✅ Asegúrate de incluirlo
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

    const payload = {
      id: usuario.id_usu,
      email: usuario.email_usu,
      rol: usuario.rol_usu.nom_rol,
    };

    console.log('📦 Payload:', payload);
    console.log('🔐 JWT_SECRET usado en firma:', process.env.JWT_SECRET);

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

    const payload = {
      id: usuario.id_usu,
      email: usuario.email_usu,
      rol: usuario.rol_usu.nom_rol, // ✅ importante
    };
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
  async exportarUsuariosExcel(): Promise<Buffer> {
    const usuarios = await this.usuarioRepository.find({
      relations: ['rol_usu'],
    });

    if (!usuarios.length) {
      throw new NotFoundException('No existen usuarios registrados');
    }

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Usuarios');

    worksheet.mergeCells('A1:G1');
    const titulo = worksheet.getCell('A1');
    titulo.value = 'REPORTE DE USUARIOS';
    titulo.font = { size: 18, bold: true, color: { argb: '305496' } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([
      'ID',
      'Nombre',
      'Correo',
      'Rol',
      'Estado',
      'Fecha de Creación',
      'Última Actualización',
    ]);

    worksheet.getRow(2).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    usuarios.forEach((usuario) => {
      worksheet.addRow([
        usuario.id_usu,
        usuario.nom_usu,
        usuario.email_usu,
        usuario.rol_usu?.nom_rol || 'Desconocido',
        usuario.esta_usu,
        usuario.crea_en_usu,
        usuario.act_en_usu,
      ]);
    });

    worksheet.columns.forEach((col, i) => {
      let maxLength = 12;
      if (col.eachCell) {
        col.eachCell({ includeEmpty: true }, (cell) => {
          const val = cell.value?.toString().length || 0;
          if (val > maxLength) maxLength = val;
        });
      }
      worksheet.getColumn(i + 1).width = maxLength + 2;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportarUsuariosPDF(): Promise<Buffer> {
    const usuarios = await this.usuarioRepository.find({
      relations: ['rol_usu'],
    });
    if (!usuarios.length) {
      throw new NotFoundException('No existen usuarios registrados');
    }

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };

    const body: any[][] = [
      [
        { text: 'ID', bold: true },
        { text: 'Nombre', bold: true },
        { text: 'Correo', bold: true },
        { text: 'Rol', bold: true },
        { text: 'Estado', bold: true },
        { text: 'Creado en', bold: true },
        { text: 'Actualizado en', bold: true },
      ],
      ...usuarios.map((u) => [
        u.id_usu,
        u.nom_usu,
        u.email_usu,
        u.rol_usu?.nom_rol || 'Desconocido',
        u.esta_usu,
        u.crea_en_usu,
        u.act_en_usu,
      ]),
    ];

    const printer = new PdfPrinter(fonts);
    const docDefinition = {
      pageOrientation: 'landscape',
      content: [
        { text: 'REPORTE DE USUARIOS', style: 'header' },
        '\n',
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', 'auto', 'auto', 'auto', '*', '*'],
            body,
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },
      },
      defaultStyle: {
        font: 'Roboto',
      },
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Uint8Array[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.end();
    });
  }

  async exportarRolesExcel(): Promise<Buffer> {
    const roles = await this.rolRepository.find();

    if (!roles.length) {
      throw new NotFoundException('No existen roles registrados');
    }

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Roles');

    worksheet.mergeCells('A1:D1');
    const titulo = worksheet.getCell('A1');
    titulo.value = 'REPORTE DE ROLES';
    titulo.font = { size: 18, bold: true, color: { argb: '305496' } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow(['ID', 'Nombre', 'Descripción', 'Estado']);

    worksheet.getRow(2).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    roles.forEach((rol) => {
      worksheet.addRow([rol.id_rol, rol.nom_rol, rol.desc_rol, rol.est_rol]);
    });

    worksheet.columns.forEach((col, i) => {
      let maxLength = 12;
      if (col.eachCell) {
        col.eachCell({ includeEmpty: true }, (cell) => {
          const val = cell.value?.toString().length || 0;
          if (val > maxLength) maxLength = val;
        });
      }
      worksheet.getColumn(i + 1).width = maxLength + 2;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportarRolesPDF(): Promise<Buffer> {
    const roles = await this.rolRepository.find();

    if (!roles.length) {
      throw new NotFoundException('No existen roles registrados');
    }

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };

    const body: any[][] = [
      [
        { text: 'ID', bold: true },
        { text: 'Nombre', bold: true },
        { text: 'Descripción', bold: true },
        { text: 'Estado', bold: true },
      ],
      ...roles.map((r) => [r.id_rol, r.nom_rol, r.desc_rol, r.est_rol]),
    ];

    const printer = new PdfPrinter(fonts);
    const docDefinition = {
      content: [
        { text: 'REPORTE DE ROLES', style: 'header' },
        '\n',
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', '*', 'auto'],
            body,
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },
      },
      defaultStyle: {
        font: 'Roboto',
      },
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Uint8Array[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.end();
    });
  }
}
