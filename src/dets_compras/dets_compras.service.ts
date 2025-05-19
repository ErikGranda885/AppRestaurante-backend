import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Det_Compra } from './det_compra.entity';
import { CreateDetCompraDto } from './dto/create-det_compra.dto';
import { Producto } from 'src/productos/producto.entity';
import { EquivalenciaService } from 'src/equivalencias/equivalencias.service';
import { LotesService } from 'src/lotes/lotes.service';

@Injectable()
export class DetCompraService {
  constructor(
    @InjectRepository(Det_Compra)
    private readonly detCompraRepository: Repository<Det_Compra>,

    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,

    private readonly equivalenciaService: EquivalenciaService,
    private readonly lotesService: LotesService,
  ) {}

  async obtenerDetallesCompra(id: number): Promise<any[]> {
    const detalles = await this.detCompraRepository
      .createQueryBuilder('dcom')
      .leftJoinAndSelect('dcom.prod_dcom', 'producto')
      .leftJoinAndSelect('dcom.comp_dcom', 'compra')
      .leftJoin(
        'lotes',
        'lote',
        'lote.id_origen = dcom.id_dcom AND lote.orig_lote = :origen',
        { origen: 'compra' },
      )
      .addSelect('lote.fecha_venc_lote', 'fecha_venc_lote')
      .where('dcom.comp_dcom = :id', { id })
      .getRawAndEntities();

    return detalles.entities.map((detalle, index) => ({
      ...detalle,
      fech_ven_prod_dcom: detalles.raw[index].fecha_venc_lote || null,
    }));
  }

  async crearDetalleCompra(
    createDetCompraDto: CreateDetCompraDto,
  ): Promise<Det_Compra> {
    try {
      const producto = await this.productoRepository.findOne({
        where: { id_prod: createDetCompraDto.prod_dcom },
      });

      if (!producto) {
        throw new NotFoundException('Producto no encontrado');
      }

      let stockFinal = createDetCompraDto.cant_dcom;

      // Ajuste por equivalencia si es insumo
      if (producto.tip_prod === 'Insumo') {
        try {
          const equivalencia =
            await this.equivalenciaService.obtenerEquivalenciaActiva(
              producto.id_prod,
            );
          stockFinal = createDetCompraDto.cant_dcom * equivalencia.cant_equiv;
        } catch (error) {
          if (!(error instanceof NotFoundException)) throw error;
        }
      }

      // Guardar detalle de compra
      const nuevoDetalle = this.detCompraRepository.create({
        comp_dcom: { id_comp: createDetCompraDto.comp_dcom } as any,
        prod_dcom: { id_prod: createDetCompraDto.prod_dcom } as any,
        cant_dcom: createDetCompraDto.cant_dcom,
        prec_uni_dcom: createDetCompraDto.prec_uni_dcom,
        sub_tot_dcom: createDetCompraDto.sub_tot_dcom,
      });

      const detalleGuardado = await this.detCompraRepository.save(nuevoDetalle);

      // Actualizar producto
      producto.stock_prod += stockFinal;
      producto.prec_comp_prod = createDetCompraDto.prec_uni_dcom;

      if (
        producto.tip_prod === 'Directo' ||
        producto.tip_prod === 'Transformado'
      ) {
        producto.prec_vent_prod = createDetCompraDto.prec_uni_dcom * 1.2;
        producto.iva_prod = 12;
      } else {
        producto.prec_vent_prod = null;
        producto.iva_prod = null;
      }

      await this.productoRepository.save(producto);

      // Crear lote asociado
      await this.lotesService.crearLoteDesdeCompra({
        prod_lote: producto.id_prod,
        cant_tot_lote: stockFinal,
        cant_disp_lote: stockFinal,
        cant_usad_lote: 0,
        fecha_vencimiento: createDetCompraDto.fech_ven_prod_dcom ?? undefined,
        estado: 'vigente',
        origen: 'compra',
        id_origen: detalleGuardado.id_dcom,
      });

      return detalleGuardado;
    } catch (error) {
      console.error('Error al crear detalle de compra:', error);
      throw new InternalServerErrorException(
        'Error al crear el detalle de compra: ' + error.message,
      );
    }
  }

  async eliminarDetalleCompra(id: number): Promise<void> {
    const result = await this.detCompraRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Detalle de compra con id ${id} no encontrado`,
      );
    }
  }

  async obtenerTodosLosDetalles(): Promise<Det_Compra[]> {
    return await this.detCompraRepository.find({
      relations: ['comp_dcom', 'prod_dcom'],
    });
  }
}
