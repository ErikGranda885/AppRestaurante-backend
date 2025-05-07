import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metricas')
  async getMetricas(@Query('fecha') fecha: string) {
    return this.dashboardService.obtenerMetricasPorFecha(fecha);
  }
}
