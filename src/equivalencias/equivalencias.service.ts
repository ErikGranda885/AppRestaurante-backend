import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equivalencia } from './equivalencia.entity';
import { CreateEquivalenciaDto } from './dto/create-equivalencia.dto';
import { UpdateEquivalenciaDto } from './dto/update-equivalencia.dto';
import { EquivalenciasGateway } from 'src/gateways/equivalencias.gateway';

@Injectable()
export class EquivalenciaService {
  constructor(
    @InjectRepository(Equivalencia)
    private equivalenciaRepository: Repository<Equivalencia>,
    private readonly equivalenciasGateway: EquivalenciasGateway,
  ) {}

  // Crear equivalencia
  async crearEquivalencia(
    createDto: CreateEquivalenciaDto,
  ): Promise<{ message: string; equivalencia: Equivalencia }> {
    // Verifica si ya existe una equivalencia activa para ese producto
    const existeActiva = await this.equivalenciaRepository.findOne({
      where: {
        prod_equiv: { id_prod: createDto.prod_equiv },
        est_equiv: 'Activo',
      },
      relations: ['prod_equiv'],
    });

    if (existeActiva) {
      throw new BadRequestException(
        `Ya existe una equivalencia activa para el producto ${createDto.prod_equiv}`,
      );
    }

    const equivalencia = this.equivalenciaRepository.create({
      prod_equiv: { id_prod: createDto.prod_equiv },
      und_prod_equiv: createDto.und_prod_equiv,
      cant_equiv: createDto.cant_equiv,
      est_equiv: createDto.est_equiv ?? 'Activo',
    });

    const equivalenciaGuardada =
      await this.equivalenciaRepository.save(equivalencia);

    this.equivalenciasGateway.emitirActualizacionEquivalencias();
    return {
      message: 'Equivalencia creada correctamente',
      equivalencia: equivalenciaGuardada,
    };
  }

  // Listar todas
  async listarEquivalencias(): Promise<Equivalencia[]> {
    return this.equivalenciaRepository.find({ relations: ['prod_equiv'] });
  }

  // Listar por producto
  async listarPorProducto(id_prod: number): Promise<Equivalencia[]> {
    return this.equivalenciaRepository.find({
      where: { prod_equiv: { id_prod } },
      relations: ['prod_equiv'],
    });
  }

  // Obtener equivalencia activa
  async obtenerEquivalenciaActiva(id_prod: number): Promise<Equivalencia> {
    const equivalencia = await this.equivalenciaRepository.findOne({
      where: { prod_equiv: { id_prod }, est_equiv: 'Activo' },
      relations: ['prod_equiv'],
    });

    if (!equivalencia) {
      throw new NotFoundException(
        `No hay equivalencia activa para el producto ${id_prod}`,
      );
    }

    return equivalencia;
  }

  // Obtener equivalencia por ID
  async listarEquivalencia(id: number): Promise<Equivalencia> {
    const equivalencia = await this.equivalenciaRepository.findOne({
      where: { id_equiv: id },
      relations: ['prod_equiv'],
    });

    if (!equivalencia) {
      throw new NotFoundException(
        `La equivalencia con id ${id} no fue encontrada`,
      );
    }

    return equivalencia;
  }

  // ✅ Actualizar equivalencia sin validación
  async actualizarEquivalencia(
    id: number,
    updateDto: UpdateEquivalenciaDto,
  ): Promise<{ message: string; equivalencia: Equivalencia }> {
    const equivalencia = await this.listarEquivalencia(id);

    Object.assign(equivalencia, updateDto);
    const equivalenciaActualizada =
      await this.equivalenciaRepository.save(equivalencia);
    this.equivalenciasGateway.emitirActualizacionEquivalencias();

    return {
      message: 'Equivalencia actualizada correctamente',
      equivalencia: equivalenciaActualizada,
    };
  }

  // ✅ Eliminar equivalencia sin validación
  async eliminarEquivalencia(id: number): Promise<{ message: string }> {
    const equivalencia = await this.listarEquivalencia(id);
    await this.equivalenciaRepository.remove(equivalencia);
    // 🔁 Emitir evento de actualización por WebSocket
    this.equivalenciasGateway.emitirActualizacionEquivalencias();
    return { message: 'Equivalencia eliminada correctamente' };
  }
}
