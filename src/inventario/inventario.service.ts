import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  differenceInCalendarDays,
  differenceInDays,
  endOfDay,
  format,
  isValid,
  startOfDay,
} from 'date-fns';
import { Producto } from 'src/productos/producto.entity';
import {
  In,
  MoreThan,
  Repository,
  DataSource,
  IsNull,
  Not,
  ILike,
} from 'typeorm';
import { Lote } from 'src/lotes/lote.entity';
import { ProductosGateway } from 'src/gateways/productos.gateway';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Lote)
    private readonly loteRepository: Repository<Lote>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    private dataSource: DataSource,
    private readonly productosGateway: ProductosGateway,
  ) {}

  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD') // descompone acentos
      .replace(/[\u0300-\u036f]/g, '') // elimina acentos
      .replace(/\s/g, '') // elimina espacios
      .toLowerCase(); // a minúsculas
  }

  async consumirProductoPorLote(
    prodId: number,
    cantidad: number,
  ): Promise<
    {
      id_lote: number;
      cantidadConsumida: number;
      cant_usad_lote: number;
      cant_disp_lote: number;
      esta_lote: string;
    }[]
  > {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lotes = await queryRunner.manager.find(Lote, {
        where: {
          prod_lote: { id_prod: prodId },
          esta_lote: In(['vigente', 'por_vencer']),
          cant_disp_lote: MoreThan(0),
        },
        order: { fecha_venc_lote: 'ASC', id_lote: 'ASC' },
      });

      let restante = cantidad;
      const lotesUsados: {
        id_lote: number;
        cantidadConsumida: number;
        cant_usad_lote: number;
        cant_disp_lote: number;
        esta_lote: string;
      }[] = [];

      for (const lote of lotes) {
        if (restante <= 0) break;

        const disponible = Number(lote.cant_disp_lote);
        const usar = Math.min(disponible, restante);

        lote.cant_usad_lote += usar;
        lote.cant_disp_lote -= usar;

        if (lote.cant_disp_lote <= 0) {
          lote.esta_lote = 'vencido';
        }

        await queryRunner.manager.save(lote);

        lotesUsados.push({
          id_lote: lote.id_lote,
          cantidadConsumida: usar,
          cant_usad_lote: lote.cant_usad_lote,
          cant_disp_lote: lote.cant_disp_lote,
          esta_lote: lote.esta_lote,
        });

        restante -= usar;
      }

      if (restante > 0) {
        throw new BadRequestException('Stock insuficiente en lotes vigentes.');
      }

      await queryRunner.commitTransaction();
      // 🔄 Actualiza el stock total de productos
      await this.sincronizarYListarProductos();
      // ✅ Emitir evento a los clientes
      this.productosGateway.emitirActualizacionProductos();
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

    const lotes = await this.loteRepository.find({
      where: {
        prod_lote: { id_prod: idProducto },
        esta_lote: In(['vigente', 'por_vencer']),
      },
    });

    const stockTotal = lotes.reduce(
      (acc, lote) => acc + Number(lote.cant_disp_lote),
      0,
    );

    producto.stock_prod = stockTotal;
    await this.productoRepository.save(producto);

    return producto;
  }

  async sincronizarYListarProductos(): Promise<any[]> {
    const productos = await this.productoRepository.find({
      where: {
        tip_prod: In(['transformado', 'directo', 'combo', 'insumo']),
      },
      relations: ['cate_prod'],
    });

    const equivalencias = await this.dataSource
      .getRepository('equivalencias')
      .createQueryBuilder('equiv')
      .leftJoinAndSelect('equiv.prod_equiv', 'producto')
      .getMany();

    console.log(
      `✅ Se encontraron ${productos.length} productos para procesar.`,
    );

    const productosConVencimiento: any[] = [];

    for (const producto of productos) {
      const lotes = await this.loteRepository.find({
        where: {
          prod_lote: { id_prod: producto.id_prod },
          esta_lote: In(['vigente', 'por_vencer']),
          cant_disp_lote: MoreThan(0),
        },
        order: {
          fecha_venc_lote: 'ASC',
          id_lote: 'ASC',
        },
      });

      /* console.log(
        `🧪 Producto: ${producto.nom_prod} - Lotes encontrados: ${lotes.length}`,
      ); */

      const stockTotal = lotes.reduce(
        (acc, lote) => acc + Number(lote.cant_disp_lote),
        0,
      );

      // Inicializa variables
      let fechaFormateada: string | null = null;
      let diasRestantes: number | null = null;

      if (lotes.length > 0 && lotes[0].fecha_venc_lote) {
        const fecha = endOfDay(new Date(lotes[0].fecha_venc_lote));
        const hoy = startOfDay(new Date());

        if (isValid(fecha)) {
          diasRestantes = differenceInCalendarDays(fecha, hoy) + 1;
          fechaFormateada = format(fecha, 'dd/MM/yyyy');

          /* console.log(
            `📅 Producto: ${producto.nom_prod} - Fecha venc: ${fechaFormateada} - Días restantes: ${diasRestantes}`,
          ); */
        } else {
          /* console.warn(`⚠️ Fecha inválida para producto: ${producto.nom_prod}`); */
        }
      } else {
        /* console.warn(
          `❌ Producto: ${producto.nom_prod} no tiene lotes válidos.`,
        ); */
      }

      producto.stock_prod = stockTotal;

      // Solo para productos tipo "insumo" con equivalencia
      let interpretacionStock: string | null = null;
      if (producto.tip_prod === 'Insumo') {
        const equiv = equivalencias.find(
          (e) => e.prod_equiv.id_prod === producto.id_prod,
        );

        if (equiv && equiv.cant_equiv > 0) {
          const unidadBase = producto.und_prod;
          const unidadEquiv = equiv.und_prod_equiv;
          const cantEquiv = equiv.cant_equiv;

          if (stockTotal > 0) {
            const cantidad = stockTotal / cantEquiv;
            let enteros = Math.floor(cantidad);
            const decimales = Number((cantidad - enteros).toFixed(2));
            const unidadFracc = unidadEquiv;

            const fraccionRedondeada = Math.round(decimales * cantEquiv);

            if (fraccionRedondeada === cantEquiv) {
              enteros += 1;
              interpretacionStock = `${enteros} ${unidadBase}`;
            } else if (enteros > 0 && fraccionRedondeada > 0) {
              interpretacionStock = `${enteros} ${unidadBase} + ${fraccionRedondeada} ${unidadFracc}`;
            } else if (enteros > 0) {
              interpretacionStock = `${enteros} ${unidadBase}`;
            } else {
              interpretacionStock = `${fraccionRedondeada} ${unidadFracc}`;
            }
          } else {
            interpretacionStock = 'Sin stock';
          }
        }
      }

      await this.productoRepository.save(producto);

      productosConVencimiento.push({
        ...producto,
        fecha_vence_proxima: fechaFormateada,
        dias_restantes: diasRestantes,
        interpretacion_stock: interpretacionStock,
      });
    }
    console.log(
      `✅ Total productos procesados con caducidad: ${productosConVencimiento.length}`,
    );

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
      const lote = await this.loteRepository.findOne({
        where: {
          prod_lote: { id_prod: producto.id_prod },
          esta_lote: In(['vigente', 'por_vencer']),
          cant_disp_lote: MoreThan(0),
          fecha_venc_lote: Not(IsNull()),
        },
        order: { fecha_venc_lote: 'ASC' },
      });

      if (lote && lote.fecha_venc_lote !== null) {
        const fechaVencimiento = endOfDay(new Date(lote.fecha_venc_lote));
        const hoy = startOfDay(new Date());

        if (!isValid(fechaVencimiento)) continue;

        const diasRestantes =
          differenceInCalendarDays(fechaVencimiento, hoy) + 1;

        if (diasRestantes >= 0) {
          productosPorCaducar.push({
            id: producto.id_prod,
            name: producto.nom_prod,
            img: producto.img_prod,
            expiresIn: `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`,
          });
        }
      }
    }

    return productosPorCaducar
      .sort(
        (a, b) =>
          parseInt(a.expiresIn.replace(/\D/g, '')) -
          parseInt(b.expiresIn.replace(/\D/g, '')),
      )
      .slice(0, limit);
  }

  async obtenerStockPorNombre(nombre: string): Promise<{
    stock?: number;
    interpretacion_stock?: string;
    suggestions?: string[];
  }> {
    const nombreClean = nombre.trim();
    if (!nombreClean) {
      throw new BadRequestException('Nombre de producto vacío');
    }

    const normalizado = this.normalizarTexto(nombreClean);
    const productos = await this.productoRepository.find();

    const producto = productos.find(
      (p) => this.normalizarTexto(p.nom_prod) === normalizado,
    );

    if (producto) {
      const actualizado = await this.sincronizarYObtenerProducto(
        producto.id_prod,
      );

      // Solo si es insumo, calcular interpretación
      let interpretacion_stock: string | undefined = undefined;
      if (actualizado.tip_prod === 'Insumo') {
        const equivalencia = await this.dataSource
          .getRepository('equivalencias')
          .createQueryBuilder('e')
          .where('e.prod_equiv = :id', { id: actualizado.id_prod })
          .getOne();

        if (equivalencia && equivalencia.cant_equiv > 0) {
          const unidadBase = actualizado.und_prod;
          const unidadEquiv = equivalencia.und_prod_equiv;
          const cantEquiv = equivalencia.cant_equiv;

          const cantidad = actualizado.stock_prod / cantEquiv;
          let enteros = Math.floor(cantidad);
          const decimales = Number((cantidad - enteros).toFixed(2));
          const unidadFracc = unidadEquiv;

          const fraccionRedondeada = Math.round(decimales * cantEquiv);

          if (fraccionRedondeada === cantEquiv) {
            enteros += 1;
            interpretacion_stock = `${enteros} ${unidadBase}`;
          } else if (enteros > 0 && fraccionRedondeada > 0) {
            interpretacion_stock = `${enteros} ${unidadBase} + ${fraccionRedondeada} ${unidadFracc}`;
          } else if (enteros > 0) {
            interpretacion_stock = `${enteros} ${unidadBase}`;
          } else {
            interpretacion_stock = `${fraccionRedondeada} ${unidadFracc}`;
          }
        }
      }

      return {
        stock: actualizado.stock_prod,
        interpretacion_stock,
      };
    }

    const sugerencias = productos
      .filter((p) => this.normalizarTexto(p.nom_prod).includes(normalizado))
      .slice(0, 3)
      .map((p) => p.nom_prod);

    return { suggestions: sugerencias };
  }
}
