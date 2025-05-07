import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { Categoria } from 'src/categorias/categoria.entity';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productosRepository: Repository<Producto>,
    @InjectRepository(Categoria)
    private categoriaRepository: Repository<Categoria>,
    private dataSource: DataSource,
  ) {}

  private excelSerialToJSDate(serial: number): Date {
    return new Date(Math.round((serial - 25569) * 86400 * 1000));
  }

  async crearProductosMasivo(
    createProductosDto: CreateProductoDto[],
  ): Promise<{ productos: Producto[]; errors: any[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const productosCreados: Producto[] = [];
    try {
      for (const dto of createProductosDto) {
        const { cate_prod, ...productData } = dto;
        const cateValue = String(cate_prod);

        const productoExistente = await queryRunner.manager.findOne(Producto, {
          where: { nom_prod: productData.nom_prod },
        });
        if (productoExistente) {
          throw new BadRequestException(
            `El producto con nombre ${productData.nom_prod} ya está registrado`,
          );
        }

        let categoria: Categoria | null = null;
        if (!isNaN(Number(cateValue))) {
          categoria = await queryRunner.manager.findOne(Categoria, {
            where: { id_cate: Number(cateValue) },
          });
        } else {
          categoria = await queryRunner.manager.findOne(Categoria, {
            where: { nom_cate: cateValue },
          });
        }

        if (!categoria) {
          throw new NotFoundException(
            `La categoría con id/nombre ${cateValue} no fue encontrada`,
          );
        }

        const producto = this.productosRepository.create({
          ...productData,
          cate_prod: categoria,
        });

        const productoGuardado = await queryRunner.manager.save(producto);
        productosCreados.push(productoGuardado);
      }
      await queryRunner.commitTransaction();
      return { productos: productosCreados, errors: [] };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async buscarPorCategoria(
    idCategoria: number,
  ): Promise<{ message: string; productos: Producto[] }> {
    const productos = await this.productosRepository.find({
      where: { cate_prod: { id_cate: idCategoria } },
    });
    if (!productos || productos.length === 0) {
      throw new NotFoundException(
        `No se encontraron productos para la categoría con id ${idCategoria}`,
      );
    }
    return {
      message: 'Productos obtenidos correctamente',
      productos,
    };
  }

  async listarProductos(): Promise<Producto[]> {
    return this.productosRepository.find();
  }
  async listarProducto(id: number): Promise<Producto> {
    const producto = await this.productosRepository.findOne({
      where: { id_prod: id },
    });
    if (!producto) {
      throw new NotFoundException(
        `El producto con id: ${id} no fue encontrado`,
      );
    }
    return producto;
  }
  async actualizarProducto(
    id: number,
    updateProductoDto: UpdateProductoDto,
  ): Promise<{ message: string; producto: Producto }> {
    const producto = await this.listarProducto(id);

    if (
      updateProductoDto.nom_prod &&
      updateProductoDto.nom_prod !== producto.nom_prod
    ) {
      const productoExistente = await this.productosRepository.findOne({
        where: { nom_prod: updateProductoDto.nom_prod },
      });
      if (productoExistente) {
        throw new ConflictException(
          `El producto con el nombre "${updateProductoDto.nom_prod}" ya se encuentra registrado.`,
        );
      }
    }

    // Actualizamos el producto con los nuevos valores
    Object.assign(producto, updateProductoDto);
    const productoActualizado = await this.productosRepository.save(producto);

    return {
      message: 'Producto actualizado correctamente',
      producto: productoActualizado,
    };
  }

  async crearProducto(
    createProductoDto: CreateProductoDto,
  ): Promise<{ message: string; producto: Producto }> {
    const { cate_prod, tip_prod, ...productoData } = createProductoDto;

    let categoria: Categoria | null = null;

    // Si el producto no es de tipo "insumo", se verifica la categoría.
    if (tip_prod.toLowerCase() !== 'insumo') {
      categoria = await this.categoriaRepository.findOne({
        where: { id_cate: cate_prod },
      });
      if (!categoria) {
        throw new NotFoundException(
          `La categoría con id ${cate_prod} no fue encontrada`,
        );
      }
    }

    const producto = this.productosRepository.create({
      ...productoData,
      tip_prod,
      cate_prod: categoria,
    });

    const productoGuardado = await this.productosRepository.save(producto);
    return {
      message: 'Producto creado correctamente',
      producto: productoGuardado,
    };
  }

  async productoRegistrado(nombre: string): Promise<boolean> {
    const producto = await this.productosRepository.findOne({
      where: { nom_prod: nombre },
    });
    return !!producto;
  }

  async inactivarProducto(
    id: number,
    updateProductoDto?: UpdateProductoDto,
  ): Promise<{ message: string; producto: Producto }> {
    const producto = await this.listarProducto(id);
    producto.est_prod = 'Inactivo';
    if (updateProductoDto) {
      if ('est_prod' in updateProductoDto) {
        delete updateProductoDto.est_prod;
      }
      Object.assign(producto, updateProductoDto);
    }

    const productoInactivado = await this.productosRepository.save(producto);

    return {
      message: 'Producto inactivado correctamente',
      producto: productoInactivado,
    };
  }
  async activarProducto(
    id: number,
    updateProductoDto?: UpdateProductoDto,
  ): Promise<{ message: string; producto: Producto }> {
    const producto = await this.listarProducto(id);
    producto.est_prod = 'Activo';

    if (updateProductoDto) {
      if ('est_prod' in updateProductoDto) {
        delete updateProductoDto.est_prod;
      }
      Object.assign(producto, updateProductoDto);
    }

    const productoActivado = await this.productosRepository.save(producto);

    return {
      message: 'Producto activado correctamente',
      producto: productoActivado,
    };
  }

  async obtenerProductosPopulares(limit: number = 7): Promise<any[]> {
    const result = await this.productosRepository
      .createQueryBuilder('producto')
      .leftJoin('producto.det_ventas', 'detalle') // ← esta es la relación correcta
      .select('producto.id_prod', 'id')
      .addSelect('producto.nom_prod', 'name')
      .addSelect('producto.img_prod', 'img')
      .addSelect('SUM(detalle.cant_dventa)', 'orders') // ← suma de cantidad vendida
      .groupBy('producto.id_prod')
      .orderBy('orders', 'DESC')
      .limit(limit)
      .getRawMany();

    return result;
  }
}
