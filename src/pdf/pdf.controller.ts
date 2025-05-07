import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { ComprasService } from 'src/compras/compras.service';
import { DetCompraService } from 'src/dets_compras/dets_compras.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('pdf')
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly comprasService: ComprasService,
    private readonly detComprasService: DetCompraService,
  ) {}

  @Get('factura/:id')
  async generarFactura(@Param('id') id: number, @Res() res: Response) {
    const compra = await this.comprasService.obtenerCompra(id);
    if (!compra) throw new NotFoundException('Compra no encontrada');

    const detalle = await this.detComprasService.obtenerDetallesCompra(id);
    if (!detalle || detalle.length === 0)
      throw new NotFoundException('No hay detalles de compra');

    // Ruta final donde Nest deja los assets
    const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
    let logoSrc = '';

    try {
      const logoBuffer = fs.readFileSync(logoPath);
      const base64Logo = logoBuffer.toString('base64');
      logoSrc = `data:image/png;base64,${base64Logo}`;
    } catch (e) {
      console.warn('⚠️ Logo no encontrado en el backend:', logoPath);
    }

    const html = this.generarHTMLFactura(compra, detalle, logoSrc);

    try {
      const pdf = await this.pdfService.generarFacturaPDF(html);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=factura_${id}.pdf`,
        'Content-Length': pdf.length,
      });

      res.send(pdf);
    } catch (error) {
      throw new InternalServerErrorException('Error generando el PDF');
    }
  }

  private generarHTMLFactura(
    compra: any,
    detalle: any[],
    logoSrc: string,
  ): string {
    const fecha = new Date(compra.fech_comp).toLocaleDateString('es-EC');

    const filas = detalle
      .map(
        (item, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${item.prod_dcom.nom_prod}</td>
            <td>${item.cant_dcom}</td>
            <td>$${item.prec_uni_dcom.toFixed(2)}</td>
            <td>$${(item.cant_dcom * item.prec_uni_dcom).toFixed(2)}</td>
          </tr>`,
      )
      .join('');

    const total = detalle.reduce(
      (acc, p) => acc + p.cant_dcom * p.prec_uni_dcom,
      0,
    );

    return `
        <html>
          <head>
            <style>
              body { font-family: Arial; padding: 20px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
              th { background-color: #f2f2f2; }
              .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
              .firmas { margin-top: 40px; display: flex; justify-content: space-around; }
              .total-box { margin-top: 20px; border: 1px solid #ddd; padding: 10px; max-width: 250px; float: right; }
              .total-box div { display: flex; justify-content: space-between; }
              .title { font-size: 18px; font-weight: bold; }
              img { object-fit: contain; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">${compra.tipo_doc_comp} #${compra.id_comp}</div>
                <p>Fecha: ${fecha}</p>
              </div>
              <img src="${logoSrc}" width="100" />
            </div>
  
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <strong>Emitido por:</strong><br/>
                ${compra.usu_comp.nom_usu}<br/>
                ${compra.usu_comp.email_usu}
              </div>
              <div>
                <strong>De:</strong><br/>
                ${compra.prov_comp.nom_prov}<br/>
                ${compra.prov_comp.email_prov}<br/>
                ${compra.prov_comp.tel_prov}<br/>
                ${compra.prov_comp.direc_prov}
              </div>
            </div>
  
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio Unitario</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${filas}
              </tbody>
            </table>
  
            <div class="total-box">
              <div><span>Total:</span><span>$${total.toFixed(2)}</span></div>
              <div><span>Descuento:</span><span>$0.00</span></div>
              <div><span>Impuesto:</span><span>$0.00</span></div>
              <div style="font-weight: bold; border-top: 1px solid #ccc; padding-top: 5px;">
                <span>Total Final:</span><span>$${total.toFixed(2)}</span>
              </div>
            </div>
  
            <div class="firmas">
              <div>_____________________<br/>Encargado de cuenta</div>
              <div>_____________________<br/>Administrador</div>
              <div>_____________________<br/>Gerente general</div>
            </div>
          </body>
        </html>
      `;
  }
}
