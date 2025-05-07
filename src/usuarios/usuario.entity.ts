import { Transform } from 'class-transformer';
import { format } from 'date-fns';
import { Rol } from 'src/roles/rol.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  IntegerType,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'usuarios' })
export class Usuario {
  @PrimaryGeneratedColumn()
  id_usu: number;

  @ManyToOne(() => Rol, (rol) => rol.id_rol, { eager: true })
  @JoinColumn({ name: 'rol_usu' })
  rol_usu: Rol;

  @Column({ type: 'varchar', length: 50 })
  nom_usu: string;

  @Column({ type: 'varchar', length: 50 })
  email_usu: string;

  @Column({ type: 'varchar', length: 50 })
  clave_usu: string;

  @CreateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  crea_en_usu: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
    onUpdate: 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  act_en_usu: Date;
  @Column({ type: 'varchar', length: 45, default: 'Activo' })
  esta_usu: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  img_usu: string;
}
