import { Module } from '@nestjs/common';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { ComprasModule } from 'src/compras/compras.module';
import { DetsComprasModule } from 'src/dets_compras/dets_compras.module';

@Module({
  controllers: [PdfController],
  providers: [PdfService],
  imports: [ComprasModule, DetsComprasModule],
})
export class PdfModule {}
