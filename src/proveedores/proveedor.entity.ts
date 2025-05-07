import { Transform } from 'class-transformer';
import { format } from 'date-fns';
import {
  Column,
  CreateDateColumn,
  Entity,
  IntegerType,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'proveedores' })
export class Proveedor {
  @PrimaryGeneratedColumn()
  id_prov: number;

  @Column({ type: 'varchar', length: 50 })
  nom_prov: string;

  @Column({ type: 'varchar', length: 50 })
  cont_prov: string;

  @Column({ type: 'varchar', length: 50 })
  tel_prov: string;

  @Column({ type: 'varchar', length: 50 })
  direc_prov: string;

  @Column({ type: 'varchar', length: 50 })
  email_prov: string;

  @Column({ type: 'varchar', length: 50 })
  ruc_prov: string;

  @Column({ type: 'varchar', length: 50 })
  est_prov: string;

  @CreateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  crea_en_prov: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
    onUpdate: 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  act_en_prov: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  img_prov: string;
}
