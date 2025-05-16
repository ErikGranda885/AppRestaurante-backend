import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receta } from 'src/recetas/receta.entity';
import { Producto } from 'src/productos/producto.entity';
import { Det_Receta } from './det_receta.entity';
import { CreateDetRecetaDto } from './dto/create-det_receta.dto';

@Injectable()
export class DetRecetaService {
  constructor(
    @InjectRepository(Det_Receta)
    private readonly detRecetaRepo: Repository<Det_Receta>,
    @InjectRepository(Receta)
    private readonly recetaRepo: Repository<Receta>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
  ) {}

  async listarPorReceta(id_rec: number): Promise<Det_Receta[]> {
    return await this.detRecetaRepo.find({
      where: { recet_rec: { id_rec } },
      relations: ['recet_rec', 'prod_rec'],
    });
  }

  async crear(dto: CreateDetRecetaDto): Promise<Det_Receta> {
    const receta = await this.recetaRepo.findOne({
      where: { id_rec: dto.recet_rec },
    });
    if (!receta) throw new NotFoundException('Receta no encontrada');

    const producto = await this.productoRepo.findOne({
      where: { id_prod: dto.prod_rec },
    });
    if (!producto) throw new NotFoundException('Producto insumo no encontrado');

    const nuevo = this.detRecetaRepo.create({
      recet_rec: receta,
      prod_rec: producto,
      cant_rec: dto.cant_rec,
      und_prod_rec: dto.und_prod_rec,
    });

    return await this.detRecetaRepo.save(nuevo);
  }

  async eliminar(id: number): Promise<{ message: string }> {
    const encontrado = await this.detRecetaRepo.findOne({
      where: { id_det_rec: id },
    });
    if (!encontrado) throw new NotFoundException('Ingrediente no encontrado');
    await this.detRecetaRepo.remove(encontrado);
    return { message: 'Ingrediente eliminado correctamente' };
  }
}
