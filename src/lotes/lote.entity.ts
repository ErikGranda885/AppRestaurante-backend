import { Transform } from 'class-transformer';
import { format } from 'date-fns';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Producto } from 'src/productos/producto.entity';

@Entity({ name: 'lotes' })
export class Lote {
  @PrimaryGeneratedColumn()
  id_lote: number;

  @ManyToOne(() => Producto, (producto) => producto.id_prod, { eager: true })
  @JoinColumn({ name: 'id_prod' })
  prod_lote: Producto;

  @Column({ type: 'int' }) // 👈 total entero
  cant_tot_lote: number;

  @Column({ type: 'int', default: 0 }) // 👈 usado entero
  cant_usad_lote: number;

  @Column({ type: 'int' }) // 👈 disponible entero
  cant_disp_lote: number;

  @Column({ type: 'date', nullable: true })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy') : value,
  )
  fecha_venc_lote: Date | null;

  @Column({ type: 'varchar', length: 20 })
  esta_lote: 'vigente' | 'por_vencer' | 'vencido';

  @Column({ type: 'varchar', length: 30 })
  orig_lote: 'compra' | 'transformacion';

  @Column({ type: 'int' })
  id_origen: number;

  @CreateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  crea_en_lote: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
    onUpdate: 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  act_en_lote: Date;
}
