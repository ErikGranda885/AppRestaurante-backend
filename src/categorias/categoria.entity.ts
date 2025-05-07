import { Entity, PrimaryGeneratedColumn, Column, IntegerType } from 'typeorm';

@Entity({ name: 'categorias' })
export class Categoria {
  @PrimaryGeneratedColumn()
  id_cate: IntegerType;

  @Column({ type: 'varchar', length: 50 })
  nom_cate: string;

  @Column({ type: 'varchar', length: 50 })
  desc_cate: string;

  @Column({ type: 'varchar', length: 50, default: 'Activo' })
  est_cate: string;
}
