import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
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
    throw new BadRequestException('La receta no tiene ingredientes definidos.');
  }

  // 👉 Paso 1: Validar stock antes de transformar
  for (const detalle of detallesReceta) {
    const idInsumo = detalle.prod_rec.id_prod;
    const requerido = detalle.cant_rec * cantidad_producida;

    const lotes = await this.detCompraRepository.find({
      where: {
        prod_dcom: { id_prod: idInsumo },
        est_lote_dcom: In(['vigente', 'por_vencer']),
        cant_disponible_dcom: MoreThan(0),
      },
    });

    const totalDisponible = lotes.reduce(
      (acc, lote) => acc + Number(lote.cant_disponible_dcom),
      0,
    );

    if (totalDisponible < requerido) {
      throw new BadRequestException(
        `Stock insuficiente para el insumo ${detalle.prod_rec.nom_prod}. Requerido: ${requerido}, disponible: ${totalDisponible}`,
      );
    }
  }

  // 👉 Paso 2: Consumir ingredientes
  for (const detalle of detallesReceta) {
    const idInsumo = detalle.prod_rec.id_prod;
    const cantidadTotalNecesaria = detalle.cant_rec * cantidad_producida;

    const lotes = await this.detCompraRepository.find({
      where: {
        prod_dcom: { id_prod: idInsumo },
        est_lote_dcom: In(['vigente', 'por_vencer']),
        cant_disponible_dcom: MoreThan(0),
      },
      order: { fech_ven_prod_dcom: 'ASC', id_dcom: 'ASC' },
    });

    let restante = cantidadTotalNecesaria;

    for (const lote of lotes) {
      if (restante <= 0) break;

      const disponible = Number(lote.cant_disponible_dcom);
      const usar = Math.min(disponible, restante);

      lote.cant_disponible_dcom = disponible - usar;
      lote.cant_usada_dcom = Number(lote.cant_usada_dcom) + usar;

      if (lote.cant_disponible_dcom === 0) {
        lote.est_lote_dcom = 'vencido';
      }

      await this.detCompraRepository.save(lote);
      restante -= usar;
    }

    // 👇 Actualizar stock general del producto insumo
    const productoInsumo = await this.productoRepository.findOneBy({
      id_prod: idInsumo,
    });

    if (productoInsumo) {
      productoInsumo.stock_prod -= cantidadTotalNecesaria;
      if (productoInsumo.stock_prod < 0) {
        productoInsumo.stock_prod = 0;
      }
      await this.productoRepository.save(productoInsumo);
    }
  }

  // 👉 Paso 3: Aumentar stock del producto transformado
  const receta = await this.recetaRepository.findOne({
    where: { id_rec: id_receta },
    relations: ['prod_rec'],
  });

  if (!receta || !receta.prod_rec) {
    throw new NotFoundException('Receta o producto transformado no encontrado.');
  }

  const productoTransformado = await this.productoRepository.findOneBy({
    id_prod: receta.prod_rec.id_prod,
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
