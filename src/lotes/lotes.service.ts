import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lote } from './lote.entity';
import { CreateLoteDto } from './dto/create-lote.dto';
import { Producto } from 'src/productos/producto.entity';

@Injectable()
export class LotesService {
  constructor(
    @InjectRepository(Lote)
    private readonly loteRepository: Repository<Lote>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
  ) {}

  // Crear nuevo lote
  async crearLote(dto: CreateLoteDto): Promise<Lote> {
    const producto = await this.productoRepository.findOne({
      where: { id_prod: dto.prod_lote },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    const nuevoLote = this.loteRepository.create({
      prod_lote: producto,
      cant_tot_lote: dto.cant_tot_lote,
      cant_usad_lote: dto.cant_usad_lote,
      cant_disp_lote: dto.cant_disp_lote,
      fecha_venc_lote: dto.fecha_venc_lote ?? null,
      esta_lote: dto.esta_lote,
      orig_lote: dto.orig_lote,
      id_origen: dto.id_origen,
    });

    return await this.loteRepository.save(nuevoLote);
  }

  // Obtener todos los lotes
  async listarLotes(): Promise<Lote[]> {
    return await this.loteRepository.find({
      order: { id_lote: 'DESC' },
    });
  }

  // Obtener lotes por producto
  async listarLotesPorProducto(id_prod: number): Promise<Lote[]> {
    const lotes = await this.loteRepository.find({
      where: {
        prod_lote: { id_prod: id_prod },
      },
      order: { fecha_venc_lote: 'ASC', id_lote: 'ASC' },
    });

    if (lotes.length === 0) {
      throw new NotFoundException(
        `No existen lotes registrados para el producto con ID ${id_prod}`,
      );
    }

    return lotes;
  }

  // Obtener un lote por ID
  async obtenerLote(id_lote: number): Promise<Lote> {
    const lote = await this.loteRepository.findOne({
      where: { id_lote },
    });

    if (!lote) {
      throw new NotFoundException(`Lote con ID ${id_lote} no encontrado`);
    }

    return lote;
  }

  // Actualizar cantidad disponible y usada (por consumo o transformación)
  async consumirLote(id_lote: number, cantidad: number): Promise<Lote> {
    const lote = await this.obtenerLote(id_lote);

    const cantidadEntera = Math.round(cantidad);

    if (lote.cant_disp_lote < cantidadEntera) {
      throw new BadRequestException(
        `Stock insuficiente en el lote. Disponible: ${lote.cant_disp_lote}`,
      );
    }

    lote.cant_disp_lote -= cantidadEntera;
    lote.cant_usad_lote += cantidadEntera;

    if (lote.cant_disp_lote <= 0) {
      lote.esta_lote = 'vencido';
    }

    console.log(
      `Guardando lote ${lote.id_lote} - usado: ${cantidadEntera}, disponible: ${lote.cant_disp_lote}`,
    );

    return await this.loteRepository.save(lote);
  }

  async crearLoteDesdeCompra(data: {
    prod_lote: number;
    cant_tot_lote: number;
    cant_disp_lote: number;
    cant_usad_lote: number;
    fecha_vencimiento?: Date;
    estado: 'vigente' | 'por_vencer' | 'vencido';
    origen: 'compra' | 'transformacion';
    id_origen: number;
  }) {
    return this.crearLote({
      prod_lote: data.prod_lote,
      cant_tot_lote: data.cant_tot_lote,
      cant_disp_lote: data.cant_disp_lote,
      cant_usad_lote: data.cant_usad_lote,
      fecha_venc_lote: data.fecha_vencimiento,
      esta_lote: data.estado,
      orig_lote: data.origen,
      id_origen: data.id_origen,
    });
  }
}
