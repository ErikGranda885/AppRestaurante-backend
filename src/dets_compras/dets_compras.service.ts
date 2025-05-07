import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Det_Compra } from './det_compra.entity';
import { CreateDetCompraDto } from './dto/create-det_compra.dto';
import { UpdateDetCompraDto } from './dto/update-det_compra.dto';
import { Producto } from 'src/productos/producto.entity';

@Injectable()
export class DetCompraService {
  constructor(
    @InjectRepository(Det_Compra)
    private readonly detCompraRepository: Repository<Det_Compra>,

    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
  ) {}

  // Obtener un detalle de compra por ID
  async obtenerDetallesCompra(id: number): Promise<Det_Compra[]> {
    const detalles = await this.detCompraRepository.find({
      where: { comp_dcom: { id_comp: id } },
    });
    if (!detalles || detalles.length === 0) {
      throw new NotFoundException(
        `No se encontraron detalles para la compra con id ${id}`,
      );
    }
    return detalles;
  }

  // Crear un nuevo detalle de compra y actualizar el producto
  async crearDetalleCompra(
    createDetCompraDto: CreateDetCompraDto,
  ): Promise<Det_Compra> {
    try {
      const fechaVencimiento = createDetCompraDto.fech_ven_prod_dcom
        ? new Date(createDetCompraDto.fech_ven_prod_dcom)
            .toISOString()
            .split('T')[0]
        : null;

      const nuevoDetalle = this.detCompraRepository.create({
        comp_dcom: { id_comp: createDetCompraDto.comp_dcom } as any,
        prod_dcom: { id_prod: createDetCompraDto.prod_dcom } as any,
        cant_dcom: createDetCompraDto.cant_dcom,
        prec_uni_dcom: createDetCompraDto.prec_uni_dcom,
        sub_tot_dcom: createDetCompraDto.sub_tot_dcom,
        fech_ven_prod_dcom: fechaVencimiento,
        lote_dcom: createDetCompraDto.lote_dcom,
        cant_usada_dcom: createDetCompraDto.cant_usada_dcom,
        cant_disponible_dcom: createDetCompraDto.cant_disponible_dcom,
        est_lote_dcom: createDetCompraDto.est_lote_dcom,
      });

      const detalleGuardado = await this.detCompraRepository.save(nuevoDetalle);

      const producto = await this.productoRepository.findOne({
        where: { id_prod: createDetCompraDto.prod_dcom },
      });

      if (!producto) {
        throw new NotFoundException('Producto no encontrado');
      }

      producto.stock_prod += createDetCompraDto.cant_dcom;
      producto.prec_comp_prod = createDetCompraDto.prec_uni_dcom;
      producto.prec_vent_prod = createDetCompraDto.prec_uni_dcom * 1.2;

      await this.productoRepository.save(producto);

      return detalleGuardado;
    } catch (error) {
      console.error('Error al crear detalle de compra:', error);
      throw new InternalServerErrorException(
        'Error al crear el detalle de compra: ' + error.message,
      );
    }
  }

  // Eliminar un detalle de compra
  async eliminarDetalleCompra(id: number): Promise<void> {
    const result = await this.detCompraRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Detalle de compra con id ${id} no encontrado`,
      );
    }
  }
}
