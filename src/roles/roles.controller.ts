import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  crear(@Body() createRolDto: CreateRolDto) {
    return this.rolesService.crearRol(createRolDto);
  }

  @Get()
  listar() {
    return this.rolesService.listarRoles();
  }

  @Get(':id')
  listarUno(@Param('id') id: string) {
    return this.rolesService.listarRol(+id);
  }

  @Put(':id')
  actualizar(@Param('id') id: string, @Body() updateRolDto: UpdateRolDto) {
    return this.rolesService.actualizarRol(+id, updateRolDto);
  }

  @Put('/inactivar/:id')
  eliminar(@Param('id') id: string) {
    return this.rolesService.inactivarRol(+id);
  }
}
