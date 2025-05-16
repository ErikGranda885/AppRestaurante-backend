import { Det_Receta } from 'src/dets_recetas/det_receta.entity';
import { Producto } from 'src/productos/producto.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
@Entity({ name: 'recetas' })
export class Receta {
  @PrimaryGeneratedColumn()
  id_rec: number;

  @ManyToOne(() => Producto, (producto) => producto.id_prod, { eager: true })
  @JoinColumn({ name: 'prod_rec' })
  prod_rec: Producto;

  @OneToMany(() => Det_Receta, (detalle) => detalle.recet_rec, {
    cascade: true,
  })
  ingredientes: Det_Receta[];

  @Column({ type: 'varchar', length: 50 })
  nom_rec: string;

  @Column({ type: 'varchar', length: 50 })
  desc_rec: string;
}
