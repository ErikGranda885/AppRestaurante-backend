import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  NotFoundException,
  Put,
} from '@nestjs/common';
import { ConfiguracionesService } from './configuraciones.service';

@Controller('configuraciones')
export class ConfiguracionesController {
  constructor(
    private readonly configuracionesService: ConfiguracionesService,
  ) {}

  /**
   * ✅ Obtener todas las configuraciones
   */
  @Get()
  async obtenerTodas() {
    const configuraciones = await this.configuracionesService.obtenerTodas();
    return {
      message: 'Configuraciones obtenidas correctamente',
      configuraciones,
    };
  }

  /**
   * ✅ Obtener una configuración específica por su clave
   */
  @Get(':clave')
  async obtenerPorClave(@Param('clave') clave: string) {
    const configuracion =
      await this.configuracionesService.obtenerPorClave(clave);
    if (!configuracion) {
      throw new NotFoundException(
        `No existe la configuración con clave: ${clave}`,
      );
    }
    return {
      message: `Configuración encontrada: ${clave}`,
      configuracion,
    };
  }

  /**
   * ✅ Actualizar o crear una configuración
   */
  @Put(':clave')
  async actualizarParametro(
    @Param('clave') clave: string,
    @Body('valor_conf') valor_conf: string,
  ) {
    const configuracion = await this.configuracionesService.establecerParametro(
      clave,
      valor_conf,
    );
    return {
      message: `Configuración ${clave} actualizada correctamente`,
      configuracion,
    };
  }
}
