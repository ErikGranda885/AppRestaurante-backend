import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { RolesService } from 'src/roles/roles.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly rolesService: RolesService,
  ) {}

  @Post()
  crear(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.crearUsuario(createUsuarioDto);
  }

  // Coloca primero el endpoint de "plantilla"
  @Get('plantilla')
  async downloadTemplate(@Res() res: Response) {
    try {
      const roles = await this.rolesService.listarRolesActivos();
      const workbook = new ExcelJS.Workbook();
      const mainSheet = workbook.addWorksheet('Usuarios');
      const rolesSheet = workbook.addWorksheet('Roles');

      // Hoja oculta con opciones de roles
      rolesSheet.addRow(['ID', 'Rol']);
      roles.forEach((role) => {
        rolesSheet.addRow([role.id_rol, role.nom_rol]);
      });
      rolesSheet.state = 'veryHidden';

      // Agregar encabezados
      mainSheet.addRow(['nom_usu', 'email_usu', 'clave_usu', 'rol_usu']);

      // Fila de ejemplo (no se debe cargar)
      const ejemplo = mainSheet.addRow([
        'Ej: Juan Pérez',
        'juan@example.com',
        '123456',
        roles[0]?.nom_rol || 'Admin',
      ]);
      ejemplo.font = { italic: true, color: { argb: 'FF999999' } };

      // Validación de roles en columna D (rol_usu)
      for (let i = 3; i <= 100; i++) {
        const cell = mainSheet.getCell(`D${i}`);
        cell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`=Roles!$B$2:$B$${roles.length + 1}`],
          showErrorMessage: true,
          error: 'Seleccione un rol de la lista',
        };
      }

      // Formato de texto para clave
      mainSheet.getColumn(3).numFmt = '@';

      // Opcional: ajustar anchos
      mainSheet.columns.forEach((col) => {
        col.width = 25;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="plantilla-usuarios.xlsx"',
      });
      res.send(buffer);
    } catch (error) {
      console.error('Error en downloadTemplate:', error);
      res.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  @Get()
  listar() {
    return this.usuariosService.listarUsuarios();
  }

  // 🚀 Endpoint para exportar usuarios en Excel
  @Get('reporte/excel')
  async exportarUsuariosExcel(@Res() res: Response) {
    const buffer = await this.usuariosService.exportarUsuariosExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=usuarios.xlsx');
    res.status(HttpStatus.OK).send(buffer);
  }

  // 🚀 Endpoint para exportar usuarios en PDF
  @Get('reporte/pdf')
  async exportarUsuariosPDF(@Res() res: Response) {
    const buffer = await this.usuariosService.exportarUsuariosPDF();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=usuarios.pdf');
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get('reporte/rol/excel')
  async exportarRolesExcel(@Res() res: Response) {
    const buffer = await this.usuariosService.exportarRolesExcel();
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="reporte_roles.xlsx"',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get('reporte/rol/pdf')
  async exportarRolesPDF(@Res() res: Response) {
    const buffer = await this.usuariosService.exportarRolesPDF();
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="reporte_roles.pdf"',
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get(':id')
  listarUno(@Param('id') id: string) {
    return this.usuariosService.listarUsuario(+id);
  }

  @Get('verificar/correo')
  async verificarCorreo(@Query('email') email: string) {
    const exists = await this.usuariosService.correoRegistrado(email);
    return { exists };
  }

  @Put(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return await this.usuariosService.actualizarUsuario(+id, updateUsuarioDto);
  }

  @Put('/inactivar/:id')
  async inactivar(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return await this.usuariosService.inactivarUsuario(+id, updateUsuarioDto);
  }

  @Put('/activar/:id')
  async activar(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return await this.usuariosService.activarUsuario(+id, updateUsuarioDto);
  }
  @Post('masivo')
  async crearBulk(@Body() createUsuariosDto: CreateUsuarioDto[]) {
    return this.usuariosService.crearUsuariosMasivo(createUsuariosDto);
  }
}
