import { Producto } from 'src/productos/producto.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

@Entity({ name: 'rendimientos' })
export class Rendimiento {
  @PrimaryColumn({ name: 'prod_org_rend' })
  prodOrgRendId: number;

  @PrimaryColumn({ name: 'prod_res_rend' })
  prodResRendId: number;

  @ManyToOne(() => Producto, { eager: true })
  @JoinColumn({ name: 'prod_org_rend', referencedColumnName: 'id_prod' })
  prod_org_rend: Producto;

  @ManyToOne(() => Producto, { eager: true })
  @JoinColumn({ name: 'prod_res_rend', referencedColumnName: 'id_prod' })
  prod_res_rend: Producto;

  @Column({ type: 'int' })
  cant_res_und_rend: number;
}
