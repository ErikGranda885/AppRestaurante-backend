import { Producto } from 'src/productos/producto.entity';
import { Venta } from 'src/ventas/venta.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'dets_ventas' })
export class Det_Venta {
  @PrimaryGeneratedColumn()
  id_dventa: number;

  @ManyToOne(() => Venta, (venta) => venta.id_vent, { eager: true })
  @JoinColumn({ name: 'vent_dventa' })
  vent_dventa: Venta;

  @ManyToOne(() => Producto, (producto) => producto.det_ventas, { eager: true })
  @JoinColumn({ name: 'prod_dventa' })
  prod_dventa: Producto;

  @Column({ type: 'int' })
  cant_dventa: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pre_uni_dventa: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  sub_tot_dventa: number;
}
