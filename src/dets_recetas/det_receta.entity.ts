import { Producto } from 'src/productos/producto.entity';
import { Receta } from 'src/recetas/receta.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'dets_recetas' })
export class Det_Receta {
  @PrimaryGeneratedColumn()
  id_det_rec: number;

  @ManyToOne(() => Receta, (receta) => receta.id_rec, { eager: true })
  @JoinColumn({ name: 'recet_rec' })
  recet_rec: Receta;

  @ManyToOne(() => Producto, (producto) => producto.id_prod, { eager: true })
  @JoinColumn({ name: 'prod_rec' })
  prod_rec: Producto;

  @Column({ type: 'int' })
  cant_rec: number;

  @Column({ type: 'varchar', length: 50 })
  und_prod_rec: string;
}
