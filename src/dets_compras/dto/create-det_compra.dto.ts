import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateDetCompraDto {
  @IsNotEmpty()
  @IsNumber()
  comp_dcom: number;

  @IsNotEmpty()
  @IsNumber()
  prod_dcom: number;

  @IsNotEmpty()
  @IsNumber()
  cant_dcom: number;

  @IsNotEmpty()
  @IsNumber()
  prec_uni_dcom: number;

  @IsNotEmpty()
  @IsNumber()
  sub_tot_dcom: number;
}
