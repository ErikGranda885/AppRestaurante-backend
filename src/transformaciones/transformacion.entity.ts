import { Receta } from 'src/recetas/receta.entity';
import { Usuario } from 'src/usuarios/usuario.entity'; // si manejas usuarios
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'transformaciones' })
export class Transformacion {
  @PrimaryGeneratedColumn()
  id_trans: number;

  @ManyToOne(() => Receta, (receta) => receta.id_rec, { eager: true })
  @JoinColumn({ name: 'rece_trans' })
  rece_trans: Receta;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cant_prod_trans: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  fecha_trans: Date | null;

  @ManyToOne(() => Usuario, (usuario) => usuario.id_usu, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'id_user' })
  usu_trans: Usuario;

  @Column({ type: 'text', nullable: true })
  obse_trans: string | null;
}
