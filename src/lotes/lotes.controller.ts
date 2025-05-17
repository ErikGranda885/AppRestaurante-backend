import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { LotesService } from './lotes.service';
import { CreateLoteDto } from './dto/create-lote.dto';
import { Lote } from './lote.entity';

@Controller('lotes')
export class LotesController {
  constructor(private readonly lotesService: LotesService) {}

  // POST /lotes → Crear un nuevo lote
  @Post()
  async crearLote(@Body() createDto: CreateLoteDto): Promise<Lote> {
    return await this.lotesService.crearLote(createDto);
  }

  // GET /lotes → Listar todos los lotes
  @Get()
  async listarTodos(): Promise<Lote[]> {
    return await this.lotesService.listarLotes();
  }

  // GET /lotes/:id → Obtener un lote por su ID
  @Get(':id')
  async obtenerLote(@Param('id', ParseIntPipe) id: number): Promise<Lote> {
    return await this.lotesService.obtenerLote(id);
  }

  // GET /lotes/producto/:id → Obtener todos los lotes de un producto
  @Get('producto/:id')
  async listarPorProducto(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Lote[]> {
    return await this.lotesService.listarLotesPorProducto(id);
  }
}
