import { Entity, PrimaryGeneratedColumn, Column, IntegerType } from 'typeorm';

@Entity({ name: 'roles' })
export class Rol {
  @PrimaryGeneratedColumn()
  id_rol: number;

  @Column({ type: 'varchar', length: 50 })
  nom_rol: string;

  @Column({ type: 'varchar', length: 50 })
  desc_rol: string;

  @Column({ type: 'varchar', length: 50, default: 'Activo' })
  est_rol: string;
}
