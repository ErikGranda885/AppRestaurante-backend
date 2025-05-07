import { Usuario } from 'src/usuarios/usuario.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'cierre_dias' })
export class Cierre_Dia {
  @PrimaryGeneratedColumn()
  id_cier: number;

  @Column({ type: 'date' })
  fech_cier: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  tot_vent_cier: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tot_dep_cier: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  tot_gas_cier: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  tot_compras_pag_cier: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  dif_cier: number;

  @Column({ type: 'varchar', nullable: true })
  comp_dep_cier: string;

  @Column({ type: 'varchar', nullable: true })
  fech_reg_cier: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.id_usu, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'usu_cier' })
  usu_cier?: Usuario | null;

  @Column({ type: 'varchar' })
  esta_cier: string;
}
