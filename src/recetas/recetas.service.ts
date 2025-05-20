import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receta } from './receta.entity';
import { Producto } from 'src/productos/producto.entity';
import { CreateRecetaDto } from './dto/create-receta.dto';
import { UpdateRecetaDto } from './dto/update-receta.dto';
import { Det_Receta } from 'src/dets_recetas/det_receta.entity';
import { Transformacion } from 'src/transformaciones/transformacion.entity';

@Injectable()
export class RecetasService {
  constructor(
    @InjectRepository(Receta)
    private recetaRepository: Repository<Receta>,

    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,

    @InjectRepository(Det_Receta)
    private detRecetaRepository: Repository<Det_Receta>,
    @InjectRepository(Transformacion)
    private transformacionRepository: Repository<Transformacion>, // ✅ nuevo
  ) {}

  // Crear una receta con ingredientes
  async crearReceta(
    createDto: CreateRecetaDto,
  ): Promise<{ message: string; receta: Receta }> {
    const productoFinal = await this.productoRepository.findOne({
      where: { id_prod: createDto.prod_rec },
    });

    if (!productoFinal) {
      throw new BadRequestException('Producto final no encontrado');
    }

    const receta = this.recetaRepository.create({
      nom_rec: createDto.nom_rec,
      desc_rec: createDto.desc_rec,
      prod_rec: productoFinal,
    });

    const recetaGuardada = await this.recetaRepository.save(receta);

    // Crear los ingredientes (detalles)
    for (const ingrediente of createDto.ingredientes) {
      const productoInsumo = await this.productoRepository.findOne({
        where: { id_prod: ingrediente.prod_rec },
      });

      if (!productoInsumo) {
        throw new BadRequestException(
          `Producto insumo con ID ${ingrediente.prod_rec} no encontrado`,
        );
      }

      const detalle = this.detRecetaRepository.create({
        recet_rec: recetaGuardada,
        prod_rec: productoInsumo,
        cant_rec: ingrediente.cant_rec,
        und_prod_rec: ingrediente.und_prod_rec,
      });

      await this.detRecetaRepository.save(detalle);
    }

    return {
      message: 'Receta creada correctamente con sus ingredientes',
      receta: recetaGuardada,
    };
  }

  // Listar todas las recetas
  async listarRecetas(): Promise<Receta[]> {
    return await this.recetaRepository.find({ relations: ['prod_rec'] });
  }

  // Obtener una receta por ID
  async obtenerReceta(id: number): Promise<Receta> {
    const receta = await this.recetaRepository.findOne({
      where: { id_rec: id },
      relations: ['prod_rec', 'ingredientes', 'ingredientes.prod_rec'],
    });

    if (!receta) {
      throw new NotFoundException(`Receta con id ${id} no encontrada`);
    }

    return receta;
  }

  // Actualizar receta
  async actualizarReceta(
    id: number,
    updateDto: UpdateRecetaDto,
  ): Promise<{ message: string; receta: Receta }> {
    const receta = await this.obtenerReceta(id);

    // ✅ Validar si ya fue usada
    const usada = await this.transformacionRepository.exist({
      where: { rece_trans: { id_rec: id } },
    });

    if (usada) {
      throw new BadRequestException(
        'Esta receta ya ha sido utilizada en transformaciones y no puede modificarse.',
      );
    }

    // seguir si no ha sido usada...
    if (updateDto.prod_rec) {
      const producto = await this.productoRepository.findOne({
        where: { id_prod: updateDto.prod_rec },
      });

      if (!producto) {
        throw new BadRequestException('Producto final no encontrado');
      }

      receta.prod_rec = producto;
    }

    receta.nom_rec = updateDto.nom_rec ?? receta.nom_rec;
    receta.desc_rec = updateDto.desc_rec ?? receta.desc_rec;

    const recetaActualizada = await this.recetaRepository.save(receta);

    return {
      message: 'Receta actualizada correctamente',
      receta: recetaActualizada,
    };
  }

  // Eliminar receta
  async eliminarReceta(id: number): Promise<{ message: string }> {
    const receta = await this.obtenerReceta(id);

    // 🔒 Verificar si ya ha sido utilizada en transformaciones
    const usada = await this.transformacionRepository.exist({
      where: { rece_trans: { id_rec: id } },
    });

    if (usada) {
      throw new BadRequestException(
        'Esta receta ya ha sido utilizada en transformaciones y no puede eliminarse.',
      );
    }

    // ✅ Eliminar ingredientes asociados primero
    await this.detRecetaRepository.delete({ recet_rec: { id_rec: id } });

    // ✅ Eliminar la receta
    await this.recetaRepository.delete(id);

    return {
      message: 'Receta eliminada correctamente',
    };
  }
}
