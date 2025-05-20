import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { Workbook } from 'exceljs';
import * as PdfPrinter from 'pdfmake';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly repo: Repository<Proveedor>,
  ) {}

  /** Crea un nuevo proveedor */
  async crearProveedor(dto: CreateProveedorDto): Promise<Proveedor> {
    // Prevenir duplicados por email
    const existe = await this.repo.findOne({
      where: { email_prov: dto.email_prov },
    });
    if (existe) {
      throw new BadRequestException(
        `El email ${dto.email_prov} ya está registrado`,
      );
    }
    const prov = this.repo.create({
      ...dto,
      est_prov: dto.est_prov ?? 'Activo',
    });
    return this.repo.save(prov);
  }

  /** Lista todos los proveedores */
  listarProveedores(): Promise<Proveedor[]> {
    return this.repo.find();
  }

  /** Obtiene un proveedor por su ID */
  async listarProveedor(id: number): Promise<Proveedor> {
    const prov = await this.repo.findOne({ where: { id_prov: id } });
    if (!prov) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
    return prov;
  }

  /** Actualiza un proveedor existente */
  async actualizarProveedor(
    id: number,
    dto: UpdateProveedorDto,
  ): Promise<Proveedor> {
    const prov = await this.listarProveedor(id);
    Object.assign(prov, dto);
    return this.repo.save(prov);
  }

  /** Elimina un proveedor por ID */
  async eliminar(id: number): Promise<void> {
    const res = await this.repo.delete(id);
    if (res.affected === 0) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
  }

  /** Marca un proveedor como inactivo */
  async inactivarProveedor(id: number): Promise<void> {
    const prov = await this.listarProveedor(id);
    prov.est_prov = 'Inactivo';
    await this.repo.save(prov);
  }

  /** Marca un proveedor como activo */
  async activarProveedor(id: number): Promise<void> {
    const prov = await this.listarProveedor(id);
    prov.est_prov = 'Activo';
    await this.repo.save(prov);
  }

  async crearProveedoresMasivo(data: CreateProveedorDto[]) {
    const proveedores = data.map((prov) =>
      this.repo.create({
        ...prov,
        est_prov: 'Activo',
      }),
    );
    const guardados = await this.repo.save(proveedores);
    return {
      message: 'Proveedores creados exitosamente',
      proveedores: guardados,
    };
  }

  async exportarProveedoresExcel(): Promise<Buffer> {
    const proveedores = await this.repo.find();

    if (!proveedores.length) {
      throw new NotFoundException('No existen proveedores registrados');
    }

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Proveedores');

    worksheet.mergeCells('A1:H1');
    const titulo = worksheet.getCell('A1');
    titulo.value = 'REPORTE DE PROVEEDORES';
    titulo.font = { size: 18, bold: true, color: { argb: '305496' } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([
      'ID',
      'Nombre',
      'Contacto',
      'Teléfono',
      'Dirección',
      'Email',
      'RUC',
      'Estado',
    ]);

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

    proveedores.forEach((prov) => {
      worksheet.addRow([
        prov.id_prov,
        prov.nom_prov,
        prov.cont_prov,
        prov.tel_prov,
        prov.direc_prov,
        prov.email_prov,
        prov.ruc_prov,
        prov.est_prov,
      ]);
    });

    worksheet.columns.forEach((column, i) => {
      let maxLength = 10;
      if (column && typeof column.eachCell === 'function') {
        column.eachCell({ includeEmpty: true }, (cell) => {
          if (cell.value) {
            const cellValue = cell.value.toString();
            if (cellValue.length > maxLength) maxLength = cellValue.length;
          }
        });
      }
      worksheet.getColumn(i + 1).width = maxLength + 2;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportarProveedoresPDF(): Promise<Buffer> {
    const proveedores = await this.repo.find();

    if (!proveedores.length) {
      throw new NotFoundException('No existen proveedores registrados');
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
        { text: 'Contacto', bold: true },
        { text: 'Teléfono', bold: true },
        { text: 'Dirección', bold: true },
        { text: 'Correo', bold: true },
        { text: 'RUC', bold: true },
        { text: 'Estado', bold: true },
      ],
      ...proveedores.map((p) => [
        p.id_prov,
        p.nom_prov,
        p.cont_prov,
        p.tel_prov,
        p.direc_prov,
        p.email_prov,
        p.ruc_prov,
        p.est_prov,
      ]),
    ];

    const printer = new PdfPrinter(fonts);
    const docDefinition = {
      pageOrientation: 'landscape',
      content: [
        { text: 'REPORTE DE PROVEEDORES', style: 'header' },
        '\n',
        {
          table: {
            headerRows: 1,
            widths: [
              'auto', // ID
              '*', // Nombre
              'auto', // Contacto
              'auto', // Teléfono
              'auto', // Dirección
              'auto', // Correo
              'auto', // RUC
              'auto', // Estado
            ],
            body: [
              [
                { text: 'ID', bold: true },
                { text: 'Nombre', bold: true },
                { text: 'Contacto', bold: true },
                { text: 'Teléfono', bold: true },
                { text: 'Dirección', bold: true },
                { text: 'Correo', bold: true },
                { text: 'RUC', bold: true },
                { text: 'Estado', bold: true },
              ],
              ...proveedores.map((p) => [
                p.id_prov,
                p.nom_prov,
                p.cont_prov,
                p.tel_prov,
                p.direc_prov,
                p.email_prov,
                p.ruc_prov,
                p.est_prov,
              ]),
            ],
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
        fontSize: 10,
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
