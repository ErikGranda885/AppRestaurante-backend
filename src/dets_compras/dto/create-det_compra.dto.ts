import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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

  @IsOptional()
  @Type(() => Date) // ✅ transforma string a Date antes de validar
  @IsDate()
  fech_ven_prod_dcom?: Date;
}
