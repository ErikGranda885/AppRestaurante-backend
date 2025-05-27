import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';
import { format } from 'date-fns';
import { Gasto } from './gasto.entity';
import { CierreDiaService } from 'src/cierre_dia/cierre_dia.service';
import { Workbook } from 'exceljs';
import * as PdfPrinter from 'pdfmake';
import { GastosGateway } from 'src/gateways/gastos.gateway';
@Injectable()
export class GastosService {
  constructor(
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    private readonly cierreDiaService: CierreDiaService,
    private readonly gastosGateway: GastosGateway,
  ) {}

  async crearGasto(createGastoDto: CreateGastoDto): Promise<Gasto> {
    const fechaGasto = createGastoDto.fech_gas
      ? new Date(createGastoDto.fech_gas)
      : new Date();
    const fecha = fechaGasto.toISOString().split('T')[0];

    // 🛡️ Validar si el día ya está cerrado
    if (await this.cierreDiaService.esDiaCerrado(fecha)) {
      throw new BadRequestException(
        `No se pueden registrar gastos en un día cerrado (${fecha}).`,
      );
    }

    // Asegurar que el cierre exista antes de registrar el gasto
    await this.cierreDiaService.verificarOCrearCierreSiNoExiste(fecha);

    const gasto = this.gastoRepository.create({
      desc_gas: createGastoDto.desc_gas,
      mont_gas: createGastoDto.mont_gas,
      fech_gas: fechaGasto,
      obs_gas: createGastoDto.obs_gas ?? '',
    });

    const gastoGuardado = await this.gastoRepository.save(gasto);

    // Emitir evento a través del gateway
    this.gastosGateway.emitirActualizacionGastos();

    // Actualizar resumen económico del día
    await this.cierreDiaService.actualizarResumenDelDia(fecha);

    return gastoGuardado;
  }

  async listarGastos(): Promise<any[]> {
    const gastos = await this.gastoRepository.find();

    return gastos.map((gasto) => {
      let fechaFormateada: string | null = null;

      if (gasto.fech_gas) {
        const fecha = new Date(gasto.fech_gas);
        if (!isNaN(fecha.getTime())) {
          fechaFormateada = format(fecha, 'dd/MM/yyyy HH:mm:ss'); // ✅ Formato completo bonito
        }
      }

      return {
        ...gasto,
        fech_gas: fechaFormateada,
      };
    });
  }

  async actualizarGasto(
    id: number,
    updateGastoDto: UpdateGastoDto,
  ): Promise<Gasto> {
    const gastoExistente = await this.gastoRepository.findOne({
      where: { id_gas: id },
    });

    if (!gastoExistente) {
      throw new NotFoundException(`Gasto con ID ${id} no encontrado`);
    }

    const fecha = gastoExistente.fech_gas.toISOString().split('T')[0];

    // 🛡️ Validar si el día ya está cerrado
    if (await this.cierreDiaService.esDiaCerrado(fecha)) {
      throw new BadRequestException(
        `No se puede modificar un gasto de un día cerrado (${fecha}).`,
      );
    }

    // ⚡ Eliminar la propiedad fech_gas si viene en el DTO
    if ('fech_gas' in updateGastoDto) {
      delete updateGastoDto.fech_gas;
    }

    const gastoActualizado = this.gastoRepository.merge(
      gastoExistente,
      updateGastoDto,
    );

    const actualizado = await this.gastoRepository.save(gastoActualizado);
    this.gastosGateway.emitirActualizacionGastos();

    const yaExiste = await this.cierreDiaService.existeCierrePorFecha(fecha);
    if (!yaExiste) {
      await this.cierreDiaService.verificarOCrearCierreSiNoExiste(fecha);
    }
    await this.cierreDiaService.actualizarResumenDelDia(fecha);

    return actualizado;
  }

  async eliminarGasto(id: number): Promise<void> {
    const gasto = await this.gastoRepository.findOne({ where: { id_gas: id } });

    if (!gasto) {
      throw new NotFoundException(`Gasto con ID ${id} no encontrado`);
    }

    const fecha = gasto.fech_gas.toISOString().split('T')[0];

    // 🛡️ Validar si el día ya está cerrado
    if (await this.cierreDiaService.esDiaCerrado(fecha)) {
      throw new BadRequestException(
        `No se puede eliminar un gasto de un día cerrado (${fecha}).`,
      );
    }

    await this.gastoRepository.remove(gasto);

    const yaExiste = await this.cierreDiaService.existeCierrePorFecha(fecha);
    if (!yaExiste) {
      await this.cierreDiaService.verificarOCrearCierreSiNoExiste(fecha);
    }

    await this.cierreDiaService.actualizarResumenDelDia(fecha);

    // 🟢 Emitir actualización por WebSocket
    this.gastosGateway.emitirActualizacionGastos();
  }

  /* Metodo para dashboard */
  async calcularTotalGastosPorFecha(
    fecha: string,
  ): Promise<{ total: number; cantidad: number }> {
    const start = new Date(`${fecha}T00:00:00`);
    const end = new Date(`${fecha}T23:59:59.999`);

    const gastos = await this.gastoRepository.find({
      where: { fech_gas: Between(start, end) },
    });

    const total = gastos.reduce(
      (acc, gasto) => acc + Number(gasto.mont_gas),
      0,
    );

    return {
      total,
      cantidad: gastos.length,
    };
  }

  async exportarGastosExcel(): Promise<Buffer> {
    const gastos = await this.gastoRepository.find();
    if (!gastos.length) {
      throw new NotFoundException('No existen gastos registrados');
    }

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Gastos');

    // Título
    worksheet.mergeCells('A1:E1');
    const titulo = worksheet.getCell('A1');
    titulo.value = 'REPORTE DE GASTOS';
    titulo.font = { size: 18, bold: true, color: { argb: '305496' } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };

    // Encabezado
    worksheet.addRow([
      'ID',
      'Descripción',
      'Fecha',
      'Monto ($)',
      'Observación',
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

    // Datos
    gastos.forEach((gasto) => {
      worksheet.addRow([
        gasto.id_gas,
        gasto.desc_gas,
        gasto.fech_gas ? format(new Date(gasto.fech_gas), 'dd/MM/yyyy') : '',
        Number(gasto.mont_gas),
        gasto.obs_gas || '',
      ]);
    });

    // Ajuste automático
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

  async exportarGastosPDF(): Promise<Buffer> {
    const gastos = await this.gastoRepository.find();
    if (!gastos.length) {
      throw new NotFoundException('No existen gastos registrados');
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
        { text: 'Descripción', bold: true },
        { text: 'Fecha', bold: true },
        { text: 'Monto ($)', bold: true },
        { text: 'Observación', bold: true },
      ],
      ...gastos.map((g) => [
        g.id_gas,
        g.desc_gas,
        g.fech_gas ? format(new Date(g.fech_gas), 'dd/MM/yyyy') : '',
        Number(g.mont_gas).toFixed(2),
        g.obs_gas || '',
      ]),
    ];

    const printer = new PdfPrinter(fonts);
    const docDefinition = {
      content: [
        { text: 'REPORTE DE GASTOS', style: 'header' },
        '\n',
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto', '*'],
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
