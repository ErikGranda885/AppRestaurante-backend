import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { Categoria } from './categoria.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Workbook } from 'exceljs';
import * as PdfPrinter from 'pdfmake';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private categoriasRepository: Repository<Categoria>,
    private dataSource: DataSource,
  ) {}
  async crearCategoriasMasivo(
    createCategoriasDto: CreateCategoriaDto[],
  ): Promise<{ categorias: Categoria[]; errors: any[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const categoriasCreadas: Categoria[] = [];
    try {
      for (const dto of createCategoriasDto) {
        // Usamos la propiedad 'nom_cate' que se espera recibir desde la carga masiva.
        const categoryName = dto.nom_cate;
        if (!categoryName) {
          throw new BadRequestException(
            'El nombre de la categoría es requerido',
          );
        }

        // Verificar si ya existe una categoría con el mismo nombre.
        const categoriaExistente = await queryRunner.manager.findOne(
          Categoria,
          {
            where: { nom_cate: categoryName },
          },
        );
        if (categoriaExistente) {
          throw new BadRequestException(
            `La categoría ${categoryName} ya está registrada`,
          );
        }

        // Crear la categoría asignando el valor correcto a la propiedad de la entidad.
        const categoria = this.categoriasRepository.create({
          ...dto,
          nom_cate: categoryName,
        });
        const categoriaGuardada = await queryRunner.manager.save(categoria);
        categoriasCreadas.push(categoriaGuardada);
      }
      await queryRunner.commitTransaction();
      return { categorias: categoriasCreadas, errors: [] };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  async crearCategoria(
    createCategoriaDto: CreateCategoriaDto,
  ): Promise<{ message: string; categoria: Categoria }> {
    const categoriaExistente = await this.categoriasRepository.findOne({
      where: { nom_cate: createCategoriaDto.nom_cate },
    });
    if (categoriaExistente) {
      throw new BadRequestException(
        `La categoría con nombre ${createCategoriaDto.nom_cate} ya existe`,
      );
    }
    const categoria = this.categoriasRepository.create(createCategoriaDto);
    const categoriaGuardada = await this.categoriasRepository.save(categoria);
    return {
      message: 'Categoría creada correctamente',
      categoria: categoriaGuardada,
    };
  }
  async listarCategorias(): Promise<{
    message: string;
    categorias: Categoria[];
  }> {
    const categorias = await this.categoriasRepository.find();
    return {
      message: 'Categorías obtenidas correctamente',
      categorias,
    };
  }
  async obtenerCategoria(
    id: number,
  ): Promise<{ message: string; categoria: Categoria }> {
    const categoria = await this.categoriasRepository.findOne({
      where: { id_cate: id },
    });
    if (!categoria) {
      throw new NotFoundException(
        `La categoría con id ${id} no fue encontrada`,
      );
    }
    return {
      message: 'Categoría obtenida correctamente',
      categoria,
    };
  }
  async actualizarCategoria(
    id: number,
    updateCategoriaDto: UpdateCategoriaDto,
  ): Promise<{ message: string; categoria: Categoria }> {
    const categoriaEncontrada = await this.categoriasRepository.findOne({
      where: { id_cate: id },
    });
    if (!categoriaEncontrada) {
      throw new NotFoundException(
        `La categoría con id ${id} no fue encontrada`,
      );
    }
    if (
      updateCategoriaDto.nom_cate &&
      updateCategoriaDto.nom_cate !== categoriaEncontrada.nom_cate
    ) {
      const categoriaExistente = await this.categoriasRepository.findOne({
        where: { nom_cate: updateCategoriaDto.nom_cate },
      });
      if (categoriaExistente) {
        throw new BadRequestException(
          `La categoría con nombre ${updateCategoriaDto.nom_cate} ya existe`,
        );
      }
    }
    Object.assign(categoriaEncontrada, updateCategoriaDto);
    const categoriaActualizada =
      await this.categoriasRepository.save(categoriaEncontrada);
    return {
      message: 'Categoría actualizada correctamente',
      categoria: categoriaActualizada,
    };
  }
  async inactivarCategoria(
    id: number,
  ): Promise<{ message: string; categoria: Categoria }> {
    const categoria = await this.categoriasRepository.findOne({
      where: { id_cate: id },
    });
    if (!categoria) {
      throw new NotFoundException(
        `La categoría con id ${id} no fue encontrada`,
      );
    }
    categoria.est_cate = 'Inactivo';
    const categoriaInactivada = await this.categoriasRepository.save(categoria);
    return {
      message: 'Categoría inactivada correctamente',
      categoria: categoriaInactivada,
    };
  }

  async categoriaRegistrada(nombre: string): Promise<boolean> {
    const categoria = await this.categoriasRepository.findOne({
      where: { nom_cate: nombre },
    });
    return !!categoria;
  }

  async activarCategoria(
    id: number,
    updateCategoriaDto?: UpdateCategoriaDto,
  ): Promise<{ message: string; categoria: Categoria }> {
    const { categoria } = await this.obtenerCategoria(id);

    categoria.est_cate = 'Activo';

    if (updateCategoriaDto) {
      if ('est_cate' in updateCategoriaDto) {
        delete updateCategoriaDto.est_cate;
      }
      Object.assign(categoria, updateCategoriaDto);
    }

    const categoriaActivada = await this.categoriasRepository.save(categoria);

    return {
      message: 'Categoria activada correctamente',
      categoria: categoriaActivada,
    };
  }

  async categoriasActivas(): Promise<Categoria[]> {
    return await this.categoriasRepository.find({
      where: { est_cate: 'Activo' },
    });
  }

  async exportarCategoriasExcel(): Promise<Buffer> {
    const categorias = await this.categoriasRepository.find();
    if (!categorias.length) {
      throw new NotFoundException('No existen categorías registradas');
    }

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Categorías');

    worksheet.mergeCells('A1:D1');
    const titulo = worksheet.getCell('A1');
    titulo.value = 'REPORTE DE CATEGORÍAS';
    titulo.font = { size: 18, bold: true, color: { argb: '305496' } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow(['ID', 'Nombre', 'Estado', 'Fecha de creación']);
    worksheet.getRow(2).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    categorias.forEach((cate) => {
      worksheet.addRow([
        cate.id_cate,
        cate.nom_cate,
        cate.est_cate,
        new Date().toLocaleDateString('es-EC'),
      ]);
    });

    worksheet.columns.forEach((column) => {
      if (column && column.eachCell) {
        let maxLength = 10;

        column.eachCell({ includeEmpty: true }, (cell) => {
          const length = cell.value ? cell.value.toString().length : 0;
          if (length > maxLength) maxLength = length;
        });

        column.width = maxLength + 2;
      }
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportarCategoriasPDF(): Promise<Buffer> {
    const categorias = await this.categoriasRepository.find();
    if (!categorias.length) {
      throw new NotFoundException('No existen categorías registradas');
    }

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };

    const body: any[][] = [
      [
        { text: 'ID', bold: true },
        { text: 'Nombre', bold: true },
        { text: 'Estado', bold: true },
        { text: 'Fecha de creación', bold: true },
      ],
      ...categorias.map((c) => [
        c.id_cate,
        c.nom_cate,
        c.est_cate,
        new Date().toLocaleDateString('es-EC'),
      ]),
    ];

    const printer = new PdfPrinter(fonts);
    const docDefinition = {
      content: [
        { text: 'REPORTE DE CATEGORÍAS', style: 'header' },
        '\n',
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto'],
            body,
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },
      },
      defaultStyle: {
        font: 'Roboto',
      },
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Uint8Array[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.end();
    });
  }
}
