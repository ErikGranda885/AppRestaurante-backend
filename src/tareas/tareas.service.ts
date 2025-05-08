import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CierreDiaService } from 'src/cierre_dia/cierre_dia.service';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { UsuariosService } from 'src/usuarios/usuarios.service';

@Injectable()
export class TareasService implements OnModuleInit {
  private readonly logger = new Logger(TareasService.name);

  constructor(
    private cierreService: CierreDiaService,
    private configService: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
    private usuariosService: UsuariosService,
  ) {}

  private registrarCronJob(
    hora: string | undefined,
    nombre: string,
    tarea: () => Promise<void>,
  ) {
    if (!hora) {
      this.logger.warn(
        `⚠️ La variable de hora para '${nombre}' no está definida.`,
      );
      return;
    }

    const [h, m] = hora.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) {
      this.logger.error(
        `❌ La hora de '${nombre}' tiene formato inválido. Usa HH:mm`,
      );
      return;
    }

    const expresion = `${m} ${h} * * *`;

    const job = new CronJob(expresion, async () => {
      await tarea();
    });

    this.schedulerRegistry.addCronJob(nombre, job);
    job.start();

    this.logger.log(`⏱️ Tarea '${nombre}' programada a las ${hora}`);
  }

  // ✅ NUEVO método para obtener fecha local (no UTC)
  private obtenerFechaLocal(): string {
    const fechaLocal = new Date();
    fechaLocal.setMinutes(
      fechaLocal.getMinutes() - fechaLocal.getTimezoneOffset(),
    );
    return fechaLocal.toISOString().split('T')[0];
  }

  private async ejecutarCreacionCierreDiario() {
    const fecha = this.obtenerFechaLocal();

    // Verifica que no haya pendientes anteriores antes de crear
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

    this.registrarCronJob(
      this.configService.get<string>('CIERRE_CREACION_HORA'),
      'cierre-creacion-diaria',
      () => this.ejecutarCreacionCierreDiario(),
    );

    this.registrarCronJob(
      this.configService.get<string>('CIERRE_VERIFICACION_HORA'),
      'cierre-verificacion-diaria',
      () => this.ejecutarVerificacionCierrePendiente(),
    );

    // 🔄 Verificar si el cierre ya existe al iniciar el servidor
    this.ejecutarCreacionCierreDiario()
      .then(() => {
        this.logger.log(
          '✅ Verificación de cierre ejecutada al iniciar el sistema',
        );
      })
      .catch((err) => {
        this.logger.error(
          '❌ Error al verificar/crear el cierre al iniciar',
          err,
        );
      });
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
}
