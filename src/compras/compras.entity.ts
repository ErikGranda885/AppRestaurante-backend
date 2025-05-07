import { Transform } from 'class-transformer';
import { format } from 'date-fns';
import { Proveedor } from 'src/proveedores/proveedor.entity';
import { Usuario } from 'src/usuarios/usuario.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'compras' })
export class Compras {
  @PrimaryGeneratedColumn()
  id_comp: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  tot_comp: number;

  @ManyToOne(() => Proveedor, (proveedor) => proveedor.id_prov, { eager: true })
  @JoinColumn({ name: 'prov_comp' })
  prov_comp: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.id_usu, { eager: true })
  @JoinColumn({ name: 'usu_comp' })
  usu_comp: number;

  @Column({ type: 'datetime' })
  fech_comp: Date;

  @Column({ type: 'datetime', nullable: true })
  fech_pag_comp: Date;

  @Column({ type: 'varchar' })
  estado_comp: string;

  @Column({ type: 'varchar', default: 'Pendiente' })
  estado_pag_comp: string;

  @Column({ type: 'varchar' })
  tipo_doc_comp: string;

  @Column({ type: 'varchar' })
  num_doc_comp: string;

  @Column({ type: 'varchar' })
  form_pag_comp: string;

  @Column({ type: 'varchar' })
  fech_venc_comp: string;

  @Column({ type: 'varchar', nullable: true })
  observ_comp: string;

  @Column({ type: 'text', nullable: true })
  obs_pago_efec_comp: string;

  @Column({ type: 'varchar', nullable: true })
  num_tra_comprob_comp: string;

  @Column({ type: 'varchar', nullable: true })
  comprob_tran_comp: string;

  @CreateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  crea_en_comp: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP(0)',
    onUpdate: 'CURRENT_TIMESTAMP(0)',
  })
  @Transform(({ value }) =>
    value ? format(new Date(value), 'dd-MM-yyyy HH:mm:ss') : value,
  )
  act_en_comp: Date;
}
