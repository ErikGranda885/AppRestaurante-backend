import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CierreDiaService } from 'src/cierre_dia/cierre_dia.service';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { ConfiguracionesService } from 'src/configuraciones/configuraciones.service';

@Injectable()
export class TareasService implements OnModuleInit {
  private readonly logger = new Logger(TareasService.name);

  constructor(
    private cierreService: CierreDiaService,
    private configService: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
    private usuariosService: UsuariosService,
    private configuracionesService: ConfiguracionesService,
  ) {}

  private obtenerFechaLocal(): string {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const fechaFinal = `${year}-${month}-${day}`;

    /* console.log(`📅 Fecha local generada: ${fechaFinal}`); */
    this.logger.log(`📅 Fecha local generada: ${fechaFinal}`);

    return fechaFinal;
  }

  private async ejecutarCreacionCierreDiario() {
    const fecha = this.obtenerFechaLocal();

    const anterioresPendientes =
      await this.cierreService.existenPendientesAnteriores(fecha);
    if (anterioresPendientes) {
      this.logger.warn(
        `No se puede crear cierre para ${fecha} porque hay cierres anteriores pendientes.`,
      );
      return;
    }

    await this.cierreService.verificarOCrearCierreSiNoExiste(fecha);
  }

  private async ejecutarVerificacionCierrePendiente() {
    const fecha = this.obtenerFechaLocal();
    await this.verificarCierreYActualizarEstado(fecha);
  }

  async onModuleInit() {
    await this.usuariosService.crearUsuarioSistemaSiNoExiste();

    const creacionHora = await this.configuracionesService.obtenerValorPorClave(
      'cierre_creacion_hora',
    );
    const verificacionHora =
      await this.configuracionesService.obtenerValorPorClave(
        'cierre_verificacion_hora',
      );

    this.logger.log(
      `🕒 Configuración de horarios: Creación: ${creacionHora ?? 'no definido'}, Verificación: ${verificacionHora ?? 'no definido'}`,
    );

    this.registrarDynamicCronJob(
      'cierre-creacion-diaria',
      () => this.ejecutarCreacionCierreDiario(),
      'cierre_creacion_hora',
    );

    this.registrarDynamicCronJob(
      'cierre-verificacion-diaria',
      () => this.ejecutarVerificacionCierrePendiente(),
      'cierre_verificacion_hora',
    );

    // Al iniciar, ejecuta inmediatamente:
    await this.ejecutarCreacionCierreDiario();
    await this.verificarCierreAnteriorNoActualizado();
  }

  private registrarDynamicCronJob(
    nombre: string,
    tarea: () => Promise<void>,
    claveConfig: string,
  ) {
    const job = new CronJob('* * * * *', async () => {
      try {
        const horaConfig =
          await this.configuracionesService.obtenerValorPorClave(claveConfig);
        if (!horaConfig || !horaConfig.includes(':')) return;
        const [h, m] = horaConfig.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return;
        const ahora = new Date();
        if (ahora.getHours() === h && ahora.getMinutes() === m) {
          this.logger.log(
            `⏳ Ejecutando tarea '${nombre}' a las ${horaConfig}`,
          );
          await tarea();
        }
      } catch (error) {
        this.logger.error(`❌ Error en cron '${nombre}':`, error);
      }
    });
    this.schedulerRegistry.addCronJob(nombre, job);
    job.start();
    this.logger.log(
      `✅ Cron dinámico '${nombre}' activo (escuchando '${claveConfig}')`,
    );
  }

  private async verificarCierreYActualizarEstado(fecha: string) {
    const cierres = await this.cierreService.listarCierresPorCerrar({
      desde: fecha,
      hasta: fecha,
    });

    if (cierres.length > 0) {
      const cierre = cierres[0];
      await this.cierreService.actualizarEstadoCierre(
        cierre.id_cier,
        'pendiente',
      );
      this.logger.log(`🔁 Cierre de ${fecha} actualizado a 'pendiente'`);
    } else {
      this.logger.log(
        `ℹ️ No hay cierres 'por cerrar' para actualizar en ${fecha}`,
      );
    }
  }

  private async verificarCierreAnteriorNoActualizado() {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);

    const year = ayer.getFullYear();
    const month = String(ayer.getMonth() + 1).padStart(2, '0');
    const day = String(ayer.getDate()).padStart(2, '0');
    const fechaAyer = `${year}-${month}-${day}`;

    const cierres = await this.cierreService.listarCierresPorCerrar({
      desde: fechaAyer,
      hasta: fechaAyer,
    });

    if (cierres.length > 0) {
      const cierre = cierres[0];
      await this.cierreService.actualizarEstadoCierre(
        cierre.id_cier,
        'pendiente',
      );
      this.logger.warn(
        `⚠️ Cierre de ${fechaAyer} quedó por cerrar y fue actualizado a 'pendiente' al iniciar el servidor`,
      );
    }
  }
}
