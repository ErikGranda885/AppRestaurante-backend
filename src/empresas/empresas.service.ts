import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from './empresa.entity';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa)
    private empresaRepository: Repository<Empresa>,
  ) {}

  async obtenerEmpresa(): Promise<{ message: string; empresa: Empresa }> {
    const empresa = (
      await this.empresaRepository.find({
        order: { id_emp: 'ASC' },
        take: 1,
      })
    )[0];

    if (!empresa) {
      throw new NotFoundException(`No existe una empresa registrada`);
    }

    return {
      message: 'Empresa obtenida correctamente',
      empresa,
    };
  }

  /**
   * Obtiene la empresa por ID (por si se usa más adelante)
   */
  async obtenerEmpresaPorId(id: number): Promise<Empresa> {
    const empresa = await this.empresaRepository.findOneBy({ id_emp: id });
    if (!empresa) {
      throw new NotFoundException(`La empresa con ID ${id} no fue encontrada`);
    }
    return empresa;
  }

  /**
   * Crea una empresa si no existe ninguna
   */
  async crearEmpresa(
    updateEmpresaDto: UpdateEmpresaDto,
  ): Promise<{ message: string; empresa: Empresa }> {
    const existe = await this.empresaRepository
      .find({
        take: 1,
        order: { id_emp: 'ASC' },
      })
      .then((results) => results[0]);

    if (existe) {
      throw new BadRequestException(`Ya existe una empresa registrada`);
    }

    const empresa = this.empresaRepository.create(updateEmpresaDto);
    const empresaGuardada = await this.empresaRepository.save(empresa);

    return {
      message: 'Empresa creada correctamente',
      empresa: empresaGuardada,
    };
  }

  /**
   * Actualiza la empresa existente
   */
  async actualizarEmpresa(
    id: number,
    updateEmpresaDto: UpdateEmpresaDto,
  ): Promise<{ message: string; empresa: Empresa }> {
    const empresa = await this.obtenerEmpresaPorId(id);

    // Asignamos los valores del DTO al objeto existente
    Object.assign(empresa, updateEmpresaDto);

    const empresaActualizada = await this.empresaRepository.save(empresa);

    return {
      message: 'Empresa actualizada correctamente',
      empresa: empresaActualizada,
    };
  }
}
