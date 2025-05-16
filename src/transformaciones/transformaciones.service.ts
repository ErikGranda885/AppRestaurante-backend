import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transformacion } from './transformacion.entity';
import { CreateTransformacionDto } from './dto/create-transformacion.dto';
import { UpdateTransformacionDto } from './dto/update-transformacion.dto';
import { Receta } from 'src/recetas/receta.entity';
import { Usuario } from 'src/usuarios/usuario.entity';
import { Det_Receta } from 'src/dets_recetas/det_receta.entity';
import { Det_Compra } from 'src/dets_compras/det_compra.entity';
import { Producto } from 'src/productos/producto.entity';

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
    @InjectRepository(Det_Compra)
    private detCompraRepository: Repository<Det_Compra>,
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
  ) {}

  async aplicarTransformacion(
    id_receta: number,
    cantidad_producida: number,
  ): Promise<void> {
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
      const cantidadTotalNecesaria = detalle.cant_rec * cantidad_producida;

      const lotes = await this.detCompraRepository.find({
        where: {
          prod_dcom: { id_prod: idInsumo },
          est_lote_dcom: 'vigente',
        },
        order: { fech_ven_prod_dcom: 'ASC' },
      });

      let cantidadPorDescontar = cantidadTotalNecesaria;

      for (const lote of lotes) {
        if (lote.cant_disponible_dcom >= cantidadPorDescontar) {
          lote.cant_disponible_dcom -= cantidadPorDescontar;
          if (lote.cant_disponible_dcom === 0) {
            lote.est_lote_dcom = 'vencido';
          }
          await this.detCompraRepository.save(lote);
          cantidadPorDescontar = 0;
          break;
        } else {
          cantidadPorDescontar -= lote.cant_disponible_dcom;
          lote.cant_disponible_dcom = 0;
          lote.est_lote_dcom = 'vencido';
          await this.detCompraRepository.save(lote);
        }
      }

      if (cantidadPorDescontar > 0) {
        throw new BadRequestException(
          `Stock insuficiente para el insumo ${detalle.prod_rec.nom_prod}`,
        );
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

    const productoTransformado = await this.productoRepository.findOne({
      where: { id_prod: receta.prod_rec.id_prod },
    });

    if (!productoTransformado) {
      throw new NotFoundException('Producto transformado no encontrado.');
    }

    productoTransformado.stock_prod += cantidad_producida;
    await this.productoRepository.save(productoTransformado);
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
}
