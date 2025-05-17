import { Compras } from 'src/compras/compras.entity';
import { Producto } from 'src/productos/producto.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'dets_compras' })
export class Det_Compra {
  @PrimaryGeneratedColumn()
  id_dcom: number;

  @ManyToOne(() => Compras, (compra) => compra.id_comp, { eager: true })
  @JoinColumn({ name: 'comp_dcom' })
  comp_dcom: Compras;

  @ManyToOne(() => Producto, (producto) => producto.id_prod, { eager: true })
  @JoinColumn({ name: 'prod_dcom' })
  prod_dcom: Producto;

  @Column({ type: 'int' })
  cant_dcom: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  prec_uni_dcom: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  sub_tot_dcom: number;
}
