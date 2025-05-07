import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'gastos' })
export class Gasto {
  @PrimaryGeneratedColumn()
  id_gas: number;

  @Column({ type: 'varchar' })
  desc_gas: string;

  @Column({ type: 'decimal', precision: 10, scale: 2  })
  mont_gas: number;

  @Column({ type: 'datetime', nullable: true })
  fech_gas: Date;

  @Column({ type: 'varchar', nullable: true })
  obs_gas: string;
}
