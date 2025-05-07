import { Transform } from 'class-transformer';
import { format } from 'date-fns';
import { Categoria } from 'src/categorias/categoria.entity';
import { Det_Venta } from 'src/dets_ventas/det_venta.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'productos' })
export class Producto {
  @PrimaryGeneratedColumn()
  id_prod: number;

  @ManyToOne(() => Categoria, (categoria) => categoria.id_cate, {
    eager: true,
  })
  @JoinColumn({ name: 'cate_prod' })
  cate_prod: Categoria | null;

  @Column({ type: 'varchar', length: 50 })
  nom_prod: string;

  @Column({ type: 'varchar', length: 50 })
  tip_prod: string;

  @Column({ type: 'varchar', length: 50 })
  und_prod: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  prec_vent_prod: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  prec_comp_prod: number;

  @Column({ type: 'int', nullable: true })
  stock_prod: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  img_prod: string;

  @Column({ type: 'varchar', length: 50, default: 'Activo' })
  est_prod: string;

  @CreateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  crea_en_prod: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
    onUpdate: 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  act_en_prod: Date;

  @OneToMany(() => Det_Venta, (detalle) => detalle.prod_dventa)
  det_ventas: Det_Venta[];
}
