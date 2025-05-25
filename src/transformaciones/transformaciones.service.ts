import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, MoreThan, Repository } from 'typeorm';
import { Transformacion } from './transformacion.entity';
import { CreateTransformacionDto } from './dto/create-transformacion.dto';
import { UpdateTransformacionDto } from './dto/update-transformacion.dto';
import { Receta } from 'src/recetas/receta.entity';
import { Usuario } from 'src/usuarios/usuario.entity';
import { Det_Receta } from 'src/dets_recetas/det_receta.entity';
import { Producto } from 'src/productos/producto.entity';
import { LotesService } from 'src/lotes/lotes.service';
import { EquivalenciaService } from 'src/equivalencias/equivalencias.service';

@Injectable()
export class TransformacionesService {
  constructor(
    @InjectRepository(Transformacion)
    private transformacionesRepository: Repository<Transformacion>,
    @InjectRepository(Receta)
    private recetaRepository: Repository<Receta>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Det_Receta)
    private detRecetaRepository: Repository<Det_Receta>,
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
    private readonly lotesService: LotesService,
    private readonly dataSource: DataSource,
    private readonly equivalenciaService: EquivalenciaService,
  ) {}

  async aplicarTransformacion(
    id_receta: number,
    cantidad_producida: number,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const detallesReceta = await this.detRecetaRepository.find({
        where: { recet_rec: { id_rec: id_receta } },
        relations: ['prod_rec'],
      });

      if (detallesReceta.length === 0) {
        throw new BadRequestException(
          'La receta no tiene ingredientes definidos.',
        );
      }

      for (const detalle of detallesReceta) {
        const idInsumo = detalle.prod_rec.id_prod;
        let requerido = detalle.cant_rec * cantidad_producida;

        // ✅ Aplicar equivalencia activa si existe
        const equivalencia =
          await this.equivalenciaService.obtenerEquivalenciaActiva(idInsumo);

        if (equivalencia) {
          // Si la unidad en receta difiere de la unidad base de equivalencia, convertir
          if (equivalencia.und_prod_equiv !== detalle.und_prod_rec) {
            console.log(
              `🔄 Convirtiendo ${requerido} ${detalle.und_prod_rec} a unidad base ${equivalencia.und_prod_equiv} para producto ${idInsumo}`,
            );
            requerido = requerido / equivalencia.cant_equiv;
          }
          // Si las unidades son iguales, se deja tal como está
        }

        // ✅ Redondear para asegurar consumo válido
        requerido = Math.round(requerido);

        const lotes = await this.lotesService.listarLotesPorProducto(idInsumo);
        const totalDisponible = lotes.reduce(
          (acc, lote) => acc + Math.floor(Number(lote.cant_disp_lote)),
          0,
        );

        if (totalDisponible < requerido) {
          throw new BadRequestException(
            `Stock insuficiente para el insumo ${detalle.prod_rec.nom_prod}. Requerido: ${requerido}, disponible: ${totalDisponible}`,
          );
        }

        let restante = requerido;
        for (const lote of lotes) {
          if (restante <= 0) break;

          const disponible = Math.floor(lote.cant_disp_lote);
          const usar = Math.min(disponible, restante);

          console.log(
            `✅ Consumiendo ${usar} del lote ${lote.id_lote} para insumo ${idInsumo}`,
          );

          await this.lotesService.consumirLote(lote.id_lote, usar);
          restante -= usar;
        }

        const productoInsumo = await this.productoRepository.findOneBy({
          id_prod: idInsumo,
        });
        if (productoInsumo) {
          productoInsumo.stock_prod -= requerido;
          if (productoInsumo.stock_prod < 0) productoInsumo.stock_prod = 0;
          await this.productoRepository.save(productoInsumo);
        }
      }

      const receta = await this.recetaRepository.findOne({
        where: { id_rec: id_receta },
        relations: ['prod_rec'],
      });

      if (!receta || !receta.prod_rec) {
        throw new NotFoundException(
          'Receta o producto transformado no encontrado.',
        );
      }

      const productoTransformado = await this.productoRepository.findOneBy({
        id_prod: receta.prod_rec.id_prod,
      });

      if (!productoTransformado) {
        throw new NotFoundException('Producto transformado no encontrado.');
      }

      productoTransformado.stock_prod += cantidad_producida;
      await this.productoRepository.save(productoTransformado);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error durante la transformación:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async crearTransformacion(
    createDto: CreateTransformacionDto,
  ): Promise<{ message: string; transformacion: Transformacion }> {
    const receta = await this.recetaRepository.findOne({
      where: { id_rec: createDto.rece_trans },
      relations: ['prod_rec'],
    });
    if (!receta) {
      throw new NotFoundException(
        `La receta con id ${createDto.rece_trans} no fue encontrada`,
      );
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { id_usu: createDto.usu_trans },
    });
    if (!usuario) {
      throw new NotFoundException(
        `El usuario con id ${createDto.usu_trans} no fue encontrado`,
      );
    }

    await this.aplicarTransformacion(receta.id_rec, createDto.cant_prod_trans);

    const transformacion = this.transformacionesRepository.create({
      cant_prod_trans: createDto.cant_prod_trans,
      fecha_trans: createDto.fecha_trans ?? new Date(),
      obse_trans: createDto.obse_trans ?? null,
      rece_trans: receta,
      usu_trans: usuario,
    });

    const transformacionGuardada =
      await this.transformacionesRepository.save(transformacion);

    // Registrar lote generado por transformación
    await this.lotesService.crearLote({
      prod_lote: receta.prod_rec.id_prod,
      cant_tot_lote: createDto.cant_prod_trans,
      cant_disp_lote: createDto.cant_prod_trans,
      cant_usad_lote: 0,
      esta_lote: 'vigente',
      fecha_venc_lote: null,
      orig_lote: 'transformacion',
      id_origen: transformacionGuardada.id_trans,
    });

    return {
      message: 'Transformación registrada correctamente',
      transformacion: transformacionGuardada,
    };
  }

  async listarTransformaciones(): Promise<Transformacion[]> {
    return await this.transformacionesRepository.find({
      relations: ['rece_trans', 'rece_trans.prod_rec', 'usu_trans'],
    });
  }

  async listarTransformacion(id: number): Promise<Transformacion> {
    const transformacion = await this.transformacionesRepository.findOne({
      where: { id_trans: id },
    });

    if (!transformacion) {
      throw new NotFoundException(
        `La transformación con id ${id} no fue encontrada`,
      );
    }

    return transformacion;
  }

  async listarPorReceta(id_rec: number): Promise<Transformacion[]> {
    return await this.transformacionesRepository.find({
      where: { rece_trans: { id_rec } },
    });
  }

  async actualizarTransformacion(
    id: number,
    updateDto: UpdateTransformacionDto,
  ): Promise<{ message: string; transformacion: Transformacion }> {
    const transformacion = await this.listarTransformacion(id);

    if (updateDto.rece_trans) {
      const receta = await this.recetaRepository.findOne({
        where: { id_rec: updateDto.rece_trans },
      });
      if (!receta) {
        throw new NotFoundException(
          `La receta con id ${updateDto.rece_trans} no fue encontrada`,
        );
      }
      transformacion.rece_trans = receta;
    }

    if (updateDto.usu_trans) {
      const usuario = await this.usuarioRepository.findOne({
        where: { id_usu: updateDto.usu_trans },
      });
      if (!usuario) {
        throw new NotFoundException(
          `El usuario con id ${updateDto.usu_trans} no fue encontrado`,
        );
      }
      transformacion.usu_trans = usuario;
    }

    Object.assign(transformacion, {
      cant_prod_trans:
        updateDto.cant_prod_trans ?? transformacion.cant_prod_trans,
      fecha_trans: updateDto.fecha_trans ?? transformacion.fecha_trans,
      obse_trans: updateDto.obse_trans ?? transformacion.obse_trans,
    });

    const actualizado =
      await this.transformacionesRepository.save(transformacion);

    return {
      message: 'Transformación actualizada correctamente',
      transformacion: actualizado,
    };
  }

  async eliminarTransformacion(id: number): Promise<{ message: string }> {
    const transformacion = await this.listarTransformacion(id);
    await this.transformacionesRepository.remove(transformacion);

    return { message: 'Transformación eliminada correctamente' };
  }

  async listarPorFecha(fecha: string): Promise<any[]> {
    const inicio = new Date(`${fecha}T00:00:00`);
    const fin = new Date(`${fecha}T23:59:59`);

    return await this.transformacionesRepository
      .createQueryBuilder('trans')
      .leftJoin('trans.rece_trans', 'receta')
      .leftJoin('receta.prod_rec', 'producto')
      .select('receta.id_rec', 'id_rec')
      .addSelect('receta.nom_rec', 'nombre_receta')
      .addSelect('producto.nom_prod', 'nombre_producto')
      .addSelect('SUM(trans.cant_prod_trans)', 'total')
      .where('trans.fecha_trans BETWEEN :inicio AND :fin', { inicio, fin })
      .groupBy('receta.id_rec')
      .addGroupBy('receta.nom_rec')
      .addGroupBy('producto.nom_prod')
      .getRawMany();
  }
}
