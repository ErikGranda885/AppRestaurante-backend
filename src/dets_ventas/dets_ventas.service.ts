import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Det_Venta } from './det_venta.entity';
import { Producto } from 'src/productos/producto.entity';
import { UpdateDetVentaDto } from './dto/update-det_venta.dto';
import { CreateDetVentaDto } from './dto/create-det_venta.dto';
import { Venta } from 'src/ventas/venta.entity';

@Injectable()
export class DetsVentasService {
  constructor(
    @InjectRepository(Det_Venta)
    private detVentaRepository: Repository<Det_Venta>,
    @InjectRepository(Venta)
    private ventaRepository: Repository<Venta>,
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
  ) {}

  async crearDetVenta(
    createDetVentaDto: CreateDetVentaDto,
  ): Promise<{ message: string; detVenta: Det_Venta }> {
    const {
      vent_dventa,
      prod_dventa,
      cant_dventa,
      pre_uni_dventa,
      sub_tot_dventa,
    } = createDetVentaDto;
    // Validar que exista la venta
    const venta = await this.ventaRepository.findOne({
      where: { id_vent: vent_dventa },
    });
    if (!venta) {
      throw new NotFoundException(`Venta con id ${vent_dventa} no encontrada`);
    }
    // Validar que exista el producto
    const producto = await this.productoRepository.findOne({
      where: { id_prod: prod_dventa },
    });
    if (!producto) {
      throw new NotFoundException(
        `Producto con id ${prod_dventa} no encontrado`,
      );
    }

    const detVenta = this.detVentaRepository.create({
      vent_dventa: venta,
      prod_dventa: producto,
      cant_dventa,
      pre_uni_dventa,
      sub_tot_dventa,
    });

    const detVentaGuardado = await this.detVentaRepository.save(detVenta);
    return {
      message: 'Detalle de venta creado correctamente',
      detVenta: detVentaGuardado,
    };
  }
  /* Obtener detalle de venta por id de venta */
  async obtenerDetVentaPorIdVenta(id_vent: number): Promise<Det_Venta[]> {
    const detVentas = await this.detVentaRepository.find({
      where: { vent_dventa: { id_vent } },
    });
    if (!detVentas || detVentas.length === 0) {
      throw new NotFoundException(
        `No se encontraron detalles de venta para la venta con id ${id_vent}`,
      );
    }
    return detVentas;
  }

  async obtenerDetVenta(id: number): Promise<Det_Venta> {
    const detVenta = await this.detVentaRepository.findOne({
      where: { id_dventa: id },
    });
    if (!detVenta) {
      throw new NotFoundException(
        `Detalle de venta con id ${id} no encontrado`,
      );
    }
    return detVenta;
  }

  async actualizarDetVenta(
    id: number,
    updateDetVentaDto: UpdateDetVentaDto,
  ): Promise<{ message: string; detVenta: Det_Venta }> {
    const detVenta = await this.obtenerDetVenta(id);

    // Si se actualiza la venta, se valida y se asigna
    if (updateDetVentaDto.vent_dventa) {
      const venta = await this.ventaRepository.findOne({
        where: { id_vent: updateDetVentaDto.vent_dventa },
      });
      if (!venta) {
        throw new NotFoundException(
          `Venta con id ${updateDetVentaDto.vent_dventa} no encontrada`,
        );
      }
      detVenta.vent_dventa = venta;
    }

    // Si se actualiza el producto, se valida y se asigna
    if (updateDetVentaDto.prod_dventa) {
      const producto = await this.productoRepository.findOne({
        where: { id_prod: updateDetVentaDto.prod_dventa },
      });
      if (!producto) {
        throw new NotFoundException(
          `Producto con id ${updateDetVentaDto.prod_dventa} no encontrado`,
        );
      }
      detVenta.prod_dventa = producto;
    }

    // Actualizar campos numéricos si se incluyen
    if (updateDetVentaDto.cant_dventa !== undefined) {
      detVenta.cant_dventa = updateDetVentaDto.cant_dventa;
    }
    if (updateDetVentaDto.pre_uni_dventa !== undefined) {
      detVenta.pre_uni_dventa = updateDetVentaDto.pre_uni_dventa;
    }

    const detVentaActualizado = await this.detVentaRepository.save(detVenta);
    return {
      message: 'Detalle de venta actualizado correctamente',
      detVenta: detVentaActualizado,
    };
  }
}
