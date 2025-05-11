import { Transform } from 'class-transformer';
import { format } from 'date-fns';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'empresas' })
export class Empresa {
  @PrimaryGeneratedColumn()
  id_emp: number;

  @Column({ type: 'varchar', length: 50 })
  nom_emp: string;

  @Column({ type: 'varchar', length: 50 })
  ruc_emp: string;

  @Column({ type: 'varchar', length: 50 })
  dir_emp: string;

  @Column({ type: 'varchar', length: 50 })
  tel_emp: string;

  @Column({ type: 'varchar', length: 50 })
  corre_emp: string;

  @Column({ type: 'varchar' })
  logo_emp: string;

  @CreateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  crea_en_emp: Date;
}
