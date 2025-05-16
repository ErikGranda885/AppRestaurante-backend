import { Producto } from 'src/productos/producto.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'equivalencias' })
export class Equivalencia {
  @PrimaryGeneratedColumn()
  id_equiv: number;

  @ManyToOne(() => Producto, (producto) => producto.id_prod, { eager: true })
  @JoinColumn({ name: 'prod_equiv' })
  prod_equiv: Producto;

  @Column({ type: 'varchar', length: 50 })
  und_prod_equiv: string;

  @Column({ type: 'int' })
  cant_equiv: number;

  @Column({ type: 'varchar', length: 50, default: 'Activo' })
  est_equiv: string;
}
