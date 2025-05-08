import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Compras } from './compras.entity';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';
import { CierreDiaService } from 'src/cierre_dia/cierre_dia.service';
import { format } from 'date-fns';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(Compras)
    private readonly comprasRepository: Repository<Compras>,
    private readonly cierreDiaService: CierreDiaService,
  ) {}

  // Obtener todas las compras
  async obtenerCompras(): Promise<Compras[]> {
    return await this.comprasRepository.find();
  }

  // Obtener una compra por ID
  async obtenerCompra(id: number): Promise<Compras> {
    const compra = await this.comprasRepository.findOneBy({ id_comp: id });
    if (!compra) {
      throw new NotFoundException(`Compra con id ${id} no encontrada`);
    }
    return compra;
  }

  /* Metodo para dashboard */
  async calcularTotalComprasPorFecha(
    fecha: string,
  ): Promise<{ total: number; cantidad: number }> {
    const start = new Date(`${fecha}T00:00:00`);
    const end = new Date(`${fecha}T23:59:59.999`);

    const compras = await this.comprasRepository.find({
      where: {
        fech_comp: Between(start, end),
        estado_pag_comp: 'pagada',
      },
    });

    const total = compras.reduce(
      (acc, compra) => acc + Number(compra.tot_comp),
      0,
    );

    return {
      total,
      cantidad: compras.length,
    };
  }

  // Crear una nueva compra
  async crearCompra(createCompraDto: CreateCompraDto): Promise<Compras> {
    try {
      const nuevaCompra = this.comprasRepository.create(createCompraDto);

      // 🛡️ Validar SIEMPRE si la fecha está cerrada (no se permite ninguna compra)
      const fecha = new Date(createCompraDto.fech_comp)
        .toISOString()
        .split('T')[0];

      const diaCerrado = await this.cierreDiaService.esDiaCerrado(fecha);
      if (diaCerrado) {
        throw new BadRequestException(
          `No se pueden registrar compras en un día cerrado (${fecha}).`,
        );
      }

      const compraGuardada = await this.comprasRepository.save(nuevaCompra);

      // ✅ Solo actualizar cierre si la compra fue pagada
      if (compraGuardada.estado_pag_comp === 'pagada') {
        await this.cierreDiaService.verificarOCrearCierreSiNoExiste(fecha);
        await this.cierreDiaService.actualizarResumenDelDia(fecha);
      }

      return compraGuardada;
    } catch (error) {
      console.error('Error al crear compra:', error);
      throw new InternalServerErrorException(
        'Error al crear la compra: ' + error.message,
      );
    }
  }

  // Actualizar una compra existente
  async actualizarCompra(
    id: number,
    updateCompraDto: UpdateCompraDto,
  ): Promise<Compras> {
    const compra = await this.obtenerCompra(id);

    const fecha = new Date(compra.fech_comp).toISOString().split('T')[0];

    // 🛡️ Validar si el día está cerrado (solo si está pagada)
    if (compra.estado_pag_comp === 'pagada') {
      if (await this.cierreDiaService.esDiaCerrado(fecha)) {
        throw new BadRequestException(
          `No se puede modificar una compra pagada de un día cerrado (${fecha}).`,
        );
      }
    }

    const compraActualizada = Object.assign(compra, updateCompraDto);
    return await this.comprasRepository.save(compraActualizada);
  }

  // Eliminar una compra
  async remove(id: number): Promise<void> {
    const compra = await this.obtenerCompra(id);

    const fecha = new Date(compra.fech_comp).toISOString().split('T')[0];

    // 🛡️ Validar si el día está cerrado (solo si está pagada)
    if (compra.estado_pag_comp === 'pagada') {
      if (await this.cierreDiaService.esDiaCerrado(fecha)) {
        throw new BadRequestException(
          `No se puede eliminar una compra pagada de un día cerrado (${fecha}).`,
        );
      }
    }

    const result = await this.comprasRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Compra con id ${id} no encontrada`);
    }
  }

  // Registrar pago de una compra
  async registrarPagoCompra(
    id: number,
    datosPago: {
      numeroComprobante?: string;
      observacion?: string;
      urlComprobante?: string;
    },
  ): Promise<Compras> {
    const compra = await this.obtenerCompra(id);

    const fechaFormateada = format(new Date(compra.fech_comp), 'yyyy-MM-dd');

    // 🛡️ Validar si el día está cerrado
    if (await this.cierreDiaService.esDiaCerrado(fechaFormateada)) {
      throw new BadRequestException(
        `No se puede registrar el pago porque el día ya está cerrado (${fechaFormateada}).`,
      );
    }

    // ✅ Actualizar estado de pago y general
    compra.estado_pag_comp = 'pagada';
    compra.estado_comp = 'completado';
    compra.fech_pag_comp = new Date();
    compra.observ_comp = datosPago.observacion || compra.observ_comp;

    // ✅ Validación y asignación según forma de pago
    if (compra.form_pag_comp === 'transferencia') {
      if (!datosPago.numeroComprobante || !datosPago.urlComprobante) {
        throw new InternalServerErrorException(
          'Faltan datos del comprobante de transferencia',
        );
      }

      compra.num_tra_comprob_comp = datosPago.numeroComprobante;
      compra.comprob_tran_comp = datosPago.urlComprobante;
    } else if (compra.form_pag_comp === 'efectivo') {
      if (!datosPago.observacion) {
        throw new InternalServerErrorException(
          'Debe registrar una observación para el pago en efectivo',
        );
      }

      compra.obs_pago_efec_comp = datosPago.observacion;
    }

    const compraActualizada = await this.comprasRepository.save(compra);

    // ✅ Actualizar resumen del cierre
    try {
      await this.cierreDiaService.verificarOCrearCierreSiNoExiste(
        fechaFormateada,
      );
      await this.cierreDiaService.actualizarResumenDelDia(fechaFormateada);
    } catch (error) {
      throw new InternalServerErrorException(
        `Error al procesar la fecha de la compra: ${error.message}`,
      );
    }

    return compraActualizada;
  }
}
