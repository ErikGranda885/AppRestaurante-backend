import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { differenceInDays, format } from 'date-fns';
import { Det_Compra } from 'src/dets_compras/det_compra.entity';
import { Producto } from 'src/productos/producto.entity';
import { In, MoreThan, Repository, DataSource, IsNull, Not } from 'typeorm';
@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Det_Compra)
    private readonly detCompraRepository: Repository<Det_Compra>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    private dataSource: DataSource,
  ) {}
  async consumirProductoPorLote(
    prodId: number,
    cantidad: number,
  ): Promise<Det_Compra[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lotes = await queryRunner.manager.find(Det_Compra, {
        where: {
          prod_dcom: { id_prod: prodId },
          est_lote_dcom: In(['vigente', 'por_vencer']),
          cant_disponible_dcom: MoreThan(0),
        },
        order: { fech_ven_prod_dcom: 'ASC', id_dcom: 'ASC' },
      });

      let restante = cantidad;
      const lotesUsados: Det_Compra[] = [];

      for (const lote of lotes) {
        if (restante === 0) break;

        const disponible = Number(lote.cant_disponible_dcom);
        const usar = Math.min(disponible, restante);

        lote.cant_usada_dcom = Number(lote.cant_usada_dcom) + usar;
        lote.cant_disponible_dcom = disponible - usar;

        await queryRunner.manager.save(lote);

        // Clonamos el lote para registrar la cantidad utilizada en este consumo
        const loteUsado = { ...lote };
        loteUsado.cant_disponible_dcom = usar;
        lotesUsados.push(loteUsado);

        restante -= usar;
      }

      if (restante > 0) {
        throw new BadRequestException('Stock insuficiente en lotes vigentes.');
      }

      await queryRunner.commitTransaction();
      return lotesUsados;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        'Error al consumir producto por lote: ' + error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async sincronizarYObtenerProducto(idProducto: number): Promise<Producto> {
    const producto = await this.productoRepository.findOne({
      where: { id_prod: idProducto },
    });

    if (!producto) {
      throw new BadRequestException(
        `Producto con ID ${idProducto} no encontrado`,
      );
    }

    const lotes = await this.detCompraRepository.find({
      where: {
        prod_dcom: { id_prod: idProducto },
        est_lote_dcom: In(['vigente', 'por_vencer']),
      },
    });

    const stockTotal = lotes.reduce(
      (acc, lote) => acc + Number(lote.cant_disponible_dcom),
      0,
    );

    producto.stock_prod = stockTotal;
    await this.productoRepository.save(producto);

    return producto;
  }

  async sincronizarYListarProductos(): Promise<any[]> {
    const productos = await this.productoRepository.find({
      where: {
        tip_prod: In(['transformado', 'directo', 'combo']),
      },
      relations: ['cate_prod'],
    });

    const productosConVencimiento: any[] = [];

    for (const producto of productos) {
      const lotes = await this.detCompraRepository.find({
        where: {
          prod_dcom: { id_prod: producto.id_prod },
          est_lote_dcom: In(['vigente', 'por_vencer']),
          cant_disponible_dcom: MoreThan(0),
        },
        order: {
          fech_ven_prod_dcom: 'ASC',
          id_dcom: 'ASC',
        },
      });

      const stockTotal = lotes.reduce(
        (acc, lote) => acc + Number(lote.cant_disponible_dcom),
        0,
      );

      let fechaFormateada: string | null = null;
      if (lotes.length > 0 && lotes[0].fech_ven_prod_dcom) {
        const fecha = new Date(lotes[0].fech_ven_prod_dcom + 'T00:00:00');
        fechaFormateada = format(fecha, 'dd/MM/yyyy');
      }

      producto.stock_prod = stockTotal;
      await this.productoRepository.save(producto);

      productosConVencimiento.push({
        ...producto,
        fecha_vence_proxima: fechaFormateada,
      });
    }

    return productosConVencimiento;
  }

  async obtenerProductosPorCaducar(limit: number = 7): Promise<
  {
    id: number;
    name: string;
    img: string | null;
    expiresIn: string;
  }[]
> {
  const productos = await this.productoRepository.find({
    where: {
      tip_prod: In(['transformado', 'directo', 'combo']),
      est_prod: 'Activo',
    },
  });

  const productosPorCaducar: {
    id: number;
    name: string;
    img: string | null;
    expiresIn: string;
  }[] = [];

  for (const producto of productos) {
    const lote = await this.detCompraRepository.findOne({
      where: {
        prod_dcom: { id_prod: producto.id_prod },
        est_lote_dcom: In(['vigente', 'por_vencer']),
        cant_disponible_dcom: MoreThan(0),
        fech_ven_prod_dcom: Not(IsNull()), // ✅ cambio aquí
      },
      order: { fech_ven_prod_dcom: 'ASC' },
    });

    if (lote && lote.fech_ven_prod_dcom) {
      const hoy = new Date();
      const fechaVencimiento = new Date(lote.fech_ven_prod_dcom + 'T00:00:00');
      const diasRestantes = differenceInDays(fechaVencimiento, hoy);

      if (diasRestantes >= 0) {
        productosPorCaducar.push({
          id: producto.id_prod,
          name: producto.nom_prod,
          img: producto.img_prod,
          expiresIn: `${diasRestantes} días`,
        });
      }
    }
  }

  return productosPorCaducar
    .sort((a, b) => parseInt(a.expiresIn) - parseInt(b.expiresIn))
    .slice(0, limit);
}
}
