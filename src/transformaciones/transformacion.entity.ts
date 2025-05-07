import { Producto } from 'src/productos/producto.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'transformaciones' })
export class Transformacion {
  @PrimaryGeneratedColumn()
  id_trans: number;

  @ManyToOne(() => Producto, (producto) => producto.id_prod, { eager: true })
  @JoinColumn({ name: 'prod_org_trans' })
  prod_org_trans: Producto;

  @ManyToOne(() => Producto, (producto) => producto.id_prod, { eager: true })
  @JoinColumn({ name: 'prod_res_trans' })
  prod_res_trans: Producto;

  @Column({ type: 'int' })
  cant_res_trans: number;

  @Column({ type: 'varchar' })
  fech_trans: string;
}
