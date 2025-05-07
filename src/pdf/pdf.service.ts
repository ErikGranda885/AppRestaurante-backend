import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { Buffer } from 'buffer'; // 👈 Importa Buffer explícitamente

@Injectable()
export class PdfService {
  async generarFacturaPDF(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
    });

    await browser.close();

    // 🔄 Convertimos el Uint8Array a Buffer
    return Buffer.from(pdfBuffer);
  }
}
