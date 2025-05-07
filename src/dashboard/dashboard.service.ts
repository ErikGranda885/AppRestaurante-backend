import { Injectable } from '@nestjs/common';
import { VentasService } from 'src/ventas/ventas.service';
import { ComprasService } from 'src/compras/compras.service';
import { GastosService } from 'src/gastos/gastos.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly ventasService: VentasService,
    private readonly comprasService: ComprasService,
    private readonly gastosService: GastosService,
  ) {}

  async obtenerMetricasPorFecha(fecha: string) {
    const [ventas, compras, gastos] = await Promise.all([
      this.ventasService.calcularTotalVentasPorFecha(fecha),
      this.comprasService.calcularTotalComprasPorFecha(fecha),
      this.gastosService.calcularTotalGastosPorFecha(fecha),
    ]);

    const diferenciaCaja = ventas.total - compras.total - gastos.total;

    return {
      totalGanado: ventas.total,
      compras,
      gastos,
      diferenciaCaja,
    };
  }
}
