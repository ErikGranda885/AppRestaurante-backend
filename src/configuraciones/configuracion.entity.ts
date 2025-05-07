import { Column, Entity, IntegerType, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'configuraciones' })
export class Configuracion {
  @PrimaryGeneratedColumn()
  id_conf: IntegerType;

  @Column({ type: 'varchar', length: 45 })
  clave_conf: string;
  
  @Column({ type: 'varchar', length: 45 })
  valor_conf: string;
}
