import { Transform } from 'class-transformer';
import { format } from 'date-fns';
import { Usuario } from 'src/usuarios/usuario.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  JoinColumn,
  IntegerType,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'ventas' })
export class Venta {
  @PrimaryGeneratedColumn()
  id_vent: IntegerType;

  @ManyToOne(() => Usuario, (usuario) => usuario.id_usu, { eager: true })
  @JoinColumn({ name: 'usu_vent' })
  usu_vent: Usuario;

  @Column({ type: 'datetime' })
  fech_vent: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  efe_recibido_vent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  efe_cambio_vent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  tot_vent: number;

  @Column({ type: 'varchar' })
  tip_pag_vent: string;

  @Column({ type: 'varchar', default: 'Abierta' })
  est_vent: string;

  @Column({ type: 'varchar', nullable: true })
  comprobante_num_vent: string | null;

  @Column({ type: 'varchar', nullable: true })
  comprobante_img_vent: string | null;

  @CreateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  crea_en_vent: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
    onUpdate: 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  act_en_vent: Date;
}
