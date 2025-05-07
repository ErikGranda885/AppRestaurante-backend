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

  @Column({ type: 'date', nullable: true })
  fech_ven_prod_dcom: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  lote_dcom: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cant_usada_dcom: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cant_disponible_dcom: number;

  @Column({
    type: 'enum',
    enum: ['vigente', 'por_vencer', 'vencido'],
    default: 'vigente',
  })
  est_lote_dcom: 'vigente' | 'por_vencer' | 'vencido';

  @Column({ type: 'int' })
  cant_dcom: number;

  @Column({ type: 'decimal', precision: 10, scale: 2  })
  prec_uni_dcom: number;

  @Column('decimal', { precision: 10, scale: 2 })
  sub_tot_dcom: number;
}
