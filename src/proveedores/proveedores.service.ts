import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly repo: Repository<Proveedor>,
  ) {}

  /** Crea un nuevo proveedor */
  async crearProveedor(dto: CreateProveedorDto): Promise<Proveedor> {
    // Prevenir duplicados por email
    const existe = await this.repo.findOne({
      where: { email_prov: dto.email_prov },
    });
    if (existe) {
      throw new BadRequestException(
        `El email ${dto.email_prov} ya está registrado`,
      );
    }
    const prov = this.repo.create({
      ...dto,
      est_prov: dto.est_prov ?? 'Activo',
    });
    return this.repo.save(prov);
  }

  /** Lista todos los proveedores */
  listarProveedores(): Promise<Proveedor[]> {
    return this.repo.find();
  }

  /** Obtiene un proveedor por su ID */
  async listarProveedor(id: number): Promise<Proveedor> {
    const prov = await this.repo.findOne({ where: { id_prov: id } });
    if (!prov) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
    return prov;
  }

  /** Actualiza un proveedor existente */
  async actualizarProveedor(
    id: number,
    dto: UpdateProveedorDto,
  ): Promise<Proveedor> {
    const prov = await this.listarProveedor(id);
    Object.assign(prov, dto);
    return this.repo.save(prov);
  }

  /** Elimina un proveedor por ID */
  async eliminar(id: number): Promise<void> {
    const res = await this.repo.delete(id);
    if (res.affected === 0) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
  }

  /** Marca un proveedor como inactivo */
  async inactivarProveedor(id: number): Promise<void> {
    const prov = await this.listarProveedor(id);
    prov.est_prov = 'Inactivo';
    await this.repo.save(prov);
  }

  /** Marca un proveedor como activo */
  async activarProveedor(id: number): Promise<void> {
    const prov = await this.listarProveedor(id);
    prov.est_prov = 'Activo';
    await this.repo.save(prov);
  }

  async crearProveedoresMasivo(data: CreateProveedorDto[]) {
    const proveedores = data.map((prov) =>
      this.repo.create({
        ...prov,
        est_prov: 'Activo',
      }),
    );
    const guardados = await this.repo.save(proveedores);
    return {
      message: 'Proveedores creados exitosamente',
      proveedores: guardados,
    };
  }
}
