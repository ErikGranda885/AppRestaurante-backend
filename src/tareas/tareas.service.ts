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

  private async crearCierreDiarioSiNoExiste(fecha: string, resumen: any) {
    const cierresHoy = await this.cierreService.listarCierresPorCerrar({
      desde: fecha,
      hasta: fecha,
    });

    if (cierresHoy.length > 0) {
      this.logger.warn(
        `⚠️ Ya existe un cierre con estado 'por cerrar' para ${fecha}`,
      );
      return;
    }

    const nuevoCierre = {
      fech_cier: fecha,
      tot_vent_cier: resumen.totalVentas,
      tot_gas_cier: resumen.totalGastos,
      tot_compras_pag_cier: resumen.totalComprasPagadas,
      tot_dep_cier: 0,
      dif_cier:
        resumen.totalVentas - resumen.totalGastos - resumen.totalComprasPagadas,
      fech_reg_cier: new Date().toISOString(),
      usu_cier: 1,
      esta_cier: 'por cerrar',
    };

    await this.cierreService.crearCierre(nuevoCierre);
    this.logger.log(`✅ Cierre creado con estado 'por cerrar' para ${fecha}`);
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
