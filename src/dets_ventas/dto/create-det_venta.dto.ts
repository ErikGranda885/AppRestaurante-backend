import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateDetVentaDto {
  @IsNotEmpty()
  @IsNumber()
  vent_dventa: number;

  @IsNotEmpty()
  @IsNumber()
  prod_dventa: number;

  @IsNotEmpty()
  @IsNumber()
  cant_dventa: number;

  @IsNotEmpty()
  @IsNumber()
  pre_uni_dventa: number;

  @IsNotEmpty()
  @IsNumber()
  sub_tot_dventa: number;
}
