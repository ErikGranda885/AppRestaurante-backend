import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from './configuracion.entity';

@Injectable()
export class ConfiguracionesService {
  constructor(
    @InjectRepository(Configuracion)
    private configuracionesRepository: Repository<Configuracion>,
  ) {}

  /**
   * ✅ Obtener todas las configuraciones
   */
  async obtenerTodas(): Promise<Configuracion[]> {
    return await this.configuracionesRepository.find();
  }

  /**
   * ✅ Obtener una configuración por su clave
   */
  async obtenerPorClave(clave: string): Promise<Configuracion> {
    const configuracion = await this.configuracionesRepository.findOneBy({
      clave_conf: clave,
    });

    if (!configuracion) {
      throw new NotFoundException(
        `No existe una configuración con la clave: ${clave}`,
      );
    }

    return configuracion;
  }

  /**
   * ✅ Obtener solo el valor de una configuración
   */
  async obtenerValor(clave: string): Promise<string> {
    const configuracion = await this.obtenerPorClave(clave);
    return configuracion.valor_conf;
  }

  /**
   * ✅ Establecer (crear o actualizar) una configuración
   */
  async establecerParametro(
    clave: string,
    valor: string,
  ): Promise<Configuracion> {
    let configuracion = await this.configuracionesRepository.findOneBy({
      clave_conf: clave,
    });

    if (configuracion) {
      // Si ya existe, actualizamos el valor
      configuracion.valor_conf = valor;
    } else {
      // Si no existe, la creamos
      configuracion = this.configuracionesRepository.create({
        clave_conf: clave,
        valor_conf: valor,
      });
    }

    return await this.configuracionesRepository.save(configuracion);
  }
}
