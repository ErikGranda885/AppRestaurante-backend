import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';
import { format } from 'date-fns';
import { Gasto } from './gasto.entity';
import { CierreDiaService } from 'src/cierre_dia/cierre_dia.service';

@Injectable()
export class GastosService {
  constructor(
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    private readonly cierreDiaService: CierreDiaService,
  ) {}

  async crearGasto(createGastoDto: CreateGastoDto): Promise<Gasto> {
    const fechaGasto = createGastoDto.fech_gas
      ? new Date(createGastoDto.fech_gas)
      : new Date();

    const fecha = fechaGasto.toISOString().split('T')[0];

    // 🛡️ Validar si el día ya está cerrado
    if (await this.cierreDiaService.esDiaCerrado(fecha)) {
      throw new BadRequestException(
        `No se pueden registrar gastos en un día cerrado (${fecha}).`,
      );
    }

    const gasto = this.gastoRepository.create({
      desc_gas: createGastoDto.desc_gas,
      mont_gas: createGastoDto.mont_gas,
      fech_gas: fechaGasto,
      obs_gas: createGastoDto.obs_gas ?? '',
    });

    const gastoGuardado = await this.gastoRepository.save(gasto);

    const yaExiste = await this.cierreDiaService.existeCierrePorFecha(fecha);
    if (!yaExiste) {
      await this.cierreDiaService.verificarOCrearCierreSiNoExiste(fecha);
    }
    await this.cierreDiaService.actualizarResumenDelDia(fecha);

    return gastoGuardado;
  }

  async listarGastos(): Promise<any[]> {
    const gastos = await this.gastoRepository.find();

    return gastos.map((gasto) => {
      let fechaFormateada: string | null = null;

      if (gasto.fech_gas) {
        const fecha = new Date(gasto.fech_gas);
        if (!isNaN(fecha.getTime())) {
          fechaFormateada = format(fecha, 'dd/MM/yyyy HH:mm:ss'); // ✅ Formato completo bonito
        }
      }

      return {
        ...gasto,
        fech_gas: fechaFormateada,
      };
    });
  }

  async actualizarGasto(
    id: number,
    updateGastoDto: UpdateGastoDto,
  ): Promise<Gasto> {
    const gastoExistente = await this.gastoRepository.findOne({
      where: { id_gas: id },
    });

    if (!gastoExistente) {
      throw new NotFoundException(`Gasto con ID ${id} no encontrado`);
    }

    const fecha = gastoExistente.fech_gas.toISOString().split('T')[0];

    // 🛡️ Validar si el día ya está cerrado
    if (await this.cierreDiaService.esDiaCerrado(fecha)) {
      throw new BadRequestException(
        `No se puede modificar un gasto de un día cerrado (${fecha}).`,
      );
    }

    // ⚡ Eliminar la propiedad fech_gas si viene en el DTO
    if ('fech_gas' in updateGastoDto) {
      delete updateGastoDto.fech_gas;
    }

    const gastoActualizado = this.gastoRepository.merge(
      gastoExistente,
      updateGastoDto,
    );

    const actualizado = await this.gastoRepository.save(gastoActualizado);

    const yaExiste = await this.cierreDiaService.existeCierrePorFecha(fecha);
    if (!yaExiste) {
      await this.cierreDiaService.verificarOCrearCierreSiNoExiste(fecha);
    }
    await this.cierreDiaService.actualizarResumenDelDia(fecha);

    return actualizado;
  }

  async eliminarGasto(id: number): Promise<void> {
    const gasto = await this.gastoRepository.findOne({ where: { id_gas: id } });

    if (!gasto) {
      throw new NotFoundException(`Gasto con ID ${id} no encontrado`);
    }

    const fecha = gasto.fech_gas.toISOString().split('T')[0];

    // 🛡️ Validar si el día ya está cerrado
    if (await this.cierreDiaService.esDiaCerrado(fecha)) {
      throw new BadRequestException(
        `No se puede eliminar un gasto de un día cerrado (${fecha}).`,
      );
    }
    await this.gastoRepository.remove(gasto);
    const yaExiste = await this.cierreDiaService.existeCierrePorFecha(fecha);
    if (!yaExiste) {
      await this.cierreDiaService.verificarOCrearCierreSiNoExiste(fecha);
    }
    await this.cierreDiaService.actualizarResumenDelDia(fecha);
  }

  /* Metodo para dashboard */
  async calcularTotalGastosPorFecha(
    fecha: string,
  ): Promise<{ total: number; cantidad: number }> {
    const start = new Date(`${fecha}T00:00:00`);
    const end = new Date(`${fecha}T23:59:59.999`);

    const gastos = await this.gastoRepository.find({
      where: { fech_gas: Between(start, end) },
    });

    const total = gastos.reduce(
      (acc, gasto) => acc + Number(gasto.mont_gas),
      0,
    );

    return {
      total,
      cantidad: gastos.length,
    };
  }
}
