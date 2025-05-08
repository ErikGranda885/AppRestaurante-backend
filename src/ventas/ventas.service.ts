// ventas.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { Venta } from './venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { Usuario } from 'src/usuarios/usuario.entity';
import { Det_Venta } from 'src/dets_ventas/det_venta.entity';
import { CierreDiaService } from 'src/cierre_dia/cierre_dia.service';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private ventaRepository: Repository<Venta>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Det_Venta)
    private detVentaRepository: Repository<Det_Venta>,
    private readonly cierreDiaService: CierreDiaService,
    private dataSource: DataSource,
  ) {}

  // Crea una nueva venta
  async crearVenta(
    createVentaDto: CreateVentaDto,
  ): Promise<{ message: string; venta: Venta }> {
    const {
      usu_vent,
      efe_recibido_vent,
      efe_cambio_vent,
      tot_vent,
      fech_vent,
      est_vent,
      tip_pag_vent,
      comprobante_num_vent,
      comprobante_img_vent,
    } = createVentaDto;

    const usuario = await this.usuarioRepository.findOne({
      where: { id_usu: usu_vent },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${usu_vent} no encontrado`);
    }

    if (tip_pag_vent === 'transferencia') {
      if (!comprobante_num_vent || !comprobante_img_vent) {
        throw new BadRequestException(
          'Para pagos por transferencia se requiere número e imagen del comprobante.',
        );
      }
    }

    if (tip_pag_vent === 'efectivo') {
      if (efe_recibido_vent === null || efe_recibido_vent === undefined) {
        throw new BadRequestException('Debes ingresar el monto recibido.');
      }

      if (efe_recibido_vent < tot_vent) {
        throw new BadRequestException(
          `El monto recibido ($${efe_recibido_vent}) no puede ser menor al total de la venta ($${tot_vent}).`,
        );
      }
    }

    // 🛡️ VALIDACIÓN DE CIERRE
    const fechaVenta = new Date(fech_vent).toISOString().split('T')[0];

    const diaCerrado = await this.cierreDiaService.esDiaCerrado(fechaVenta);
    if (diaCerrado) {
      throw new BadRequestException(
        `No se pueden registrar ventas en un día cerrado (${fechaVenta}).`,
      );
    }

    const venta = new Venta();
    venta.usu_vent = usuario;
    venta.tot_vent = tot_vent;
    venta.fech_vent = fech_vent;
    venta.est_vent =
      tip_pag_vent === 'transferencia' ? 'Por validar' : 'Sin cerrar';
    venta.tip_pag_vent = tip_pag_vent;

    if (tip_pag_vent === 'transferencia') {
      venta.comprobante_num_vent = comprobante_num_vent || null;
      venta.comprobante_img_vent = comprobante_img_vent || null;
    }

    if (tip_pag_vent === 'efectivo') {
      venta.efe_recibido_vent = efe_recibido_vent ?? 0;
      venta.efe_cambio_vent = efe_cambio_vent ?? 0;
    }

    const ventaGuardada = await this.ventaRepository.save(venta);

    // ✅ ACTUALIZAR RESUMEN DEL CIERRE
    await this.cierreDiaService.verificarOCrearCierreSiNoExiste(fechaVenta);
    await this.cierreDiaService.actualizarResumenDelDia(fechaVenta);

    return {
      message: 'Venta creada exitosamente',
      venta: ventaGuardada,
    };
  }

  // Lista todas las ventas
  async listarVentas(): Promise<Venta[]> {
    return this.ventaRepository.find();
  }

  // Obtiene una venta por su id
  async obtenerVenta(id: number): Promise<Venta> {
    const venta = await this.ventaRepository.findOne({
      where: { id_vent: id },
    });
    if (!venta) {
      throw new NotFoundException(`Venta con id ${id} no encontrada`);
    }
    return venta;
  }

  /* Metodo para calcular las ventas por categorias */
  async obtenerVentasPorCategoria(): Promise<
    { categoria: string; total: number }[]
  > {
    return await this.dataSource
      .getRepository(Det_Venta)
      .createQueryBuilder('detalle')
      .leftJoin('detalle.prod_dventa', 'producto')
      .leftJoin('producto.cate_prod', 'categoria')
      .select('categoria.nom_cate', 'categoria')
      .addSelect('SUM(detalle.sub_tot_dventa)', 'total')
      .groupBy('categoria.nom_cate')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  /* Metodo para Dashboard */
  async calcularTotalVentasPorFecha(fecha: string): Promise<{ total: number }> {
    const inicio = new Date(`${fecha}T00:00:00`);
    const fin = new Date(`${fecha}T23:59:59.999`);

    const ventas = await this.ventaRepository.find({
      where: {
        fech_vent: Between(inicio, fin),
        est_vent: In(['Cerrada', 'Sin cerrar']),
      },
    });

    const total = ventas.reduce(
      (acc, venta) => acc + Number(venta.tot_vent),
      0,
    );

    return { total };
  }

  // Actualiza una venta existente
  async actualizarVenta(
    id: number,
    updateVentaDto: UpdateVentaDto,
  ): Promise<{ message: string; venta: Venta }> {
    const venta = await this.obtenerVenta(id);

    // Si se actualiza el usuario asociado, validar que exista
    if (updateVentaDto.usu_vent) {
      const usuario = await this.usuarioRepository.findOne({
        where: { id_usu: updateVentaDto.usu_vent },
      });
      if (!usuario) {
        throw new NotFoundException(
          `Usuario con id ${updateVentaDto.usu_vent} no encontrado`,
        );
      }
      venta.usu_vent = usuario;
    }

    Object.assign(venta, updateVentaDto);
    const ventaActualizada = await this.ventaRepository.save(venta);
    return {
      message: 'Venta actualizada exitosamente',
      venta: ventaActualizada,
    };
  }

  /* Cambiar estado de la venta */
  async actualizarEstado(
    id: number,
    est_vent: string,
  ): Promise<{ message: string; venta: Venta }> {
    const venta = await this.obtenerVenta(id);
    venta.est_vent = est_vent;
    await this.ventaRepository.save(venta);

    const ventaActualizada = await this.ventaRepository.findOne({
      where: { id_vent: id },
      relations: ['usu_vent', 'usu_vent.rol_usu'],
    });

    if (!ventaActualizada) {
      throw new NotFoundException(
        `Venta con id ${id} no encontrada tras la actualización`,
      );
    }

    return {
      message: 'Estado de la venta actualizado exitosamente',
      venta: ventaActualizada,
    };
  }

  // Filtra ventas por estado
  async filtrarVentasPorEstado(est_vent: string): Promise<Venta[]> {
    return this.ventaRepository.find({ where: { est_vent } });
  }
  // Filtra ventas por fecha
  async filtrarVentasPorFecha(fech_vent: Date): Promise<Venta[]> {
    return this.ventaRepository.find({ where: { fech_vent } });
  }
  // Filtra ventas por usuario
  async filtrarVentasPorUsuario(usu_vent: number): Promise<Venta[]> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usu: usu_vent },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${usu_vent} no encontrado`);
    }
    return this.ventaRepository.find({ where: { usu_vent: usuario } });
  }
  async listarVentasConDetalles(): Promise<any[]> {
    const ventas = await this.ventaRepository.find({
      relations: ['usu_vent'],
      order: { fech_vent: 'DESC' },
    });

    const resultados = await Promise.all(
      ventas.map(async (venta) => {
        const detalles = await this.detVentaRepository.find({
          where: { vent_dventa: { id_vent: venta.id_vent } },
          relations: ['prod_dventa'],
        });

        const productos = detalles.map((det) => ({
          nombre: det.prod_dventa.nom_prod,
          cantidad: det.cant_dventa,
          precio: det.pre_uni_dventa,
          subtotal: det.sub_tot_dventa,
        }));

        return {
          id_venta: venta.id_vent,
          cliente: venta.usu_vent,
          tipoOrden: venta.tip_pag_vent,
          estado: venta.est_vent,
          tipoPago: venta.tip_pag_vent,
          comprobante: venta.comprobante_num_vent,
          comprobanteImg: venta.comprobante_img_vent,
          fecha: venta.fech_vent,
          efectivoRecibido: venta.efe_recibido_vent,
          efectivoCambio: venta.efe_cambio_vent,
          total: venta.tot_vent,
          productos,
        };
      }),
    );

    return resultados;
  }

  /* Obtener ventas por periodo (mensual, semanal, diario) */
  async obtenerVentasPorPeriodo(): Promise<{
    mensual: { periodo: string; ventas: number }[];
    semanal: { periodo: string; ventas: number }[];
    diario: { periodo: string; ventas: number }[];
  }> {
    const ventas = await this.ventaRepository.find();

    const mensual: Record<string, number> = {};
    const semanal: Record<string, number> = {};
    const diario: Record<string, number> = {};

    for (const venta of ventas) {
      const fecha = new Date(venta.fech_vent);
      const mes = fecha.toLocaleString('es-EC', { month: 'long' });
      const dia = fecha.toLocaleString('es-EC', { weekday: 'short' });
      const semana = `Semana ${Math.ceil(fecha.getDate() / 7)}`;

      mensual[mes] = (mensual[mes] || 0) + Number(venta.tot_vent);
      semanal[semana] = (semanal[semana] || 0) + Number(venta.tot_vent);
      diario[dia] = (diario[dia] || 0) + Number(venta.tot_vent);
    }

    return {
      mensual: Object.entries(mensual).map(([periodo, ventas]) => ({
        periodo,
        ventas,
      })),
      semanal: Object.entries(semanal).map(([periodo, ventas]) => ({
        periodo,
        ventas,
      })),
      diario: Object.entries(diario).map(([periodo, ventas]) => ({
        periodo,
        ventas,
      })),
    };
  }

  // Obtener las últimas N ventas
  async obtenerUltimasVentas(limit = 5): Promise<any[]> {
    const ventas = await this.ventaRepository.find({
      relations: ['usu_vent'],
      order: { fech_vent: 'DESC' },
      take: limit,
    });

    return ventas.map((venta) => ({
      id_vent: venta.id_vent,
      usuario: venta.usu_vent?.nom_usu,
      total: venta.tot_vent,
      fecha: venta.fech_vent,
      metodo_pago: venta.tip_pag_vent,
      estado: venta.est_vent,
    }));
  }

  // Obtener ventas por transferencia con comprobante pendientes
  async ventasPendientesPorTransferencia(): Promise<any[]> {
    const ventas = await this.ventaRepository.find({
      where: {
        tip_pag_vent: 'transferencia',
        comprobante_num_vent: Not(IsNull()),
        comprobante_img_vent: Not(IsNull()),
        est_vent: 'Por validar',
      },
    });

    return ventas.map((venta) => ({
      id_vent: venta.id_vent,
      usuario: venta.usu_vent?.nom_usu,
      total: venta.tot_vent,
      fecha: venta.fech_vent,
      comprobante: venta.comprobante_num_vent,
      imagen: venta.comprobante_img_vent,
    }));
  }
}
