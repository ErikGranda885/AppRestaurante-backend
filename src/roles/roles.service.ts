import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateRolDto } from './dto/update-rol.dto';
import { Rol } from './rol.entity';
import { CreateRolDto } from './dto/create-rol.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolesGateway } from 'src/gateways/roles.gateway';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Rol)
    private rolesRepository: Repository<Rol>,
    private readonly rolesGateway: RolesGateway,
  ) {}

  async crearRol(
    createRolDto: CreateRolDto,
  ): Promise<{ message: string; rol: Rol }> {
    const rolExistente = await this.rolesRepository.findOne({
      where: { nom_rol: createRolDto.nom_rol },
    });
    if (rolExistente) {
      throw new BadRequestException(
        `El rol con nombre ${createRolDto.nom_rol} ya existe`,
      );
    }
    const rol = this.rolesRepository.create(createRolDto);
    const rolGuardado = await this.rolesRepository.save(rol);
    // 👇 Emitimos el evento WebSocket
    this.rolesGateway.emitirActualizacionRoles();
    console.log("📡 Evento 'roles-actualizados' emitido");
    return {
      message: 'Rol creado correctamente',
      rol: rolGuardado,
    };
  }

  async listarRoles(): Promise<{ message: string; roles: Rol[] }> {
    const roles = await this.rolesRepository.find();
    return {
      message: 'Roles obtenidos correctamente',
      roles,
    };
  }

  async listarRol(id: number): Promise<Rol> {
    const rol = await this.rolesRepository.findOne({ where: { id_rol: id } });
    if (!rol) {
      throw new NotFoundException(`El rol con id ${id} no fue encontrado`);
    }
    return rol;
  }

  async actualizarRol(
    id: number,
    updateRolDto: UpdateRolDto,
  ): Promise<{ message: string; rol: Rol }> {
    const rolEncontrado = await this.listarRol(id);

    if (
      updateRolDto.nom_rol &&
      updateRolDto.nom_rol !== rolEncontrado.nom_rol
    ) {
      const rolExistente = await this.rolesRepository.findOne({
        where: { nom_rol: updateRolDto.nom_rol },
      });
      if (rolExistente) {
        throw new BadRequestException(
          `El rol con nombre ${updateRolDto.nom_rol} ya existe`,
        );
      }
    }

    // Actualizamos la entidad con los datos del DTO
    Object.assign(rolEncontrado, updateRolDto);
    const rolActualizado = await this.rolesRepository.save(rolEncontrado);

    return {
      message: 'Rol actualizado correctamente',
      rol: rolActualizado,
    };
  }

  async inactivarRol(id: number): Promise<{ message: string; rol: Rol }> {
    // Obtenemos el rol existente
    const rol = await this.listarRol(id);
    rol.est_rol = 'Inactivo';
    const rolInactivado = await this.rolesRepository.save(rol);
    return {
      message: 'Rol inactivado correctamente',
      rol: rolInactivado,
    };
  }
  async listarRolesActivos(): Promise<Rol[]> {
    return this.rolesRepository.find({
      where: { est_rol: 'Activo' },
    });
  }
}
