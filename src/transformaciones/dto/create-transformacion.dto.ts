import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTransformacionDto {
  @IsNotEmpty()
  @IsNumber()
  rece_trans: number;

  @IsNotEmpty()
  @IsNumber()
  cant_prod_trans: number;

  @IsOptional()
  @IsDate()
  fecha_trans?: Date;

  @IsNotEmpty()
  @IsNumber()
  usu_trans: number;

  @IsOptional()
  @IsString()
  obse_trans?: string;
}
