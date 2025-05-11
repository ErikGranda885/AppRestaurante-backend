import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  ParseIntPipe,
} from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  /**
   * Obtener la empresa única del sistema
   */
  @Get()
  async obtenerEmpresa() {
    return await this.empresasService.obtenerEmpresa();
  }

  /**
   * Obtener empresa específica por ID
   */
  @Get(':id')
  async obtenerEmpresaPorId(@Param('id', ParseIntPipe) id: number) {
    const empresa = await this.empresasService.obtenerEmpresaPorId(id);
    return {
      message: 'Empresa obtenida correctamente',
      empresa,
    };
  }

  /**
   * Crear una empresa (solo si no existe una ya registrada)
   */
  @Post()
  async crearEmpresa(@Body() updateEmpresaDto: UpdateEmpresaDto) {
    return await this.empresasService.crearEmpresa(updateEmpresaDto);
  }

  /**
   * Actualizar empresa existente
   */
  @Put(':id')
  async actualizarEmpresa(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmpresaDto: UpdateEmpresaDto,
  ) {
    return await this.empresasService.actualizarEmpresa(id, updateEmpresaDto);
  }
}
