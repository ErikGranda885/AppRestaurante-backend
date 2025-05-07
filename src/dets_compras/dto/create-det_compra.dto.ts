import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum EstadoLote {
  VIGENTE = 'vigente',
  POR_VENCER = 'por_vencer',
  VENCIDO = 'vencido',
}

export class CreateDetCompraDto {
  @IsNotEmpty()
  @IsNumber()
  comp_dcom: number;

  @IsNotEmpty()
  @IsNumber()
  prod_dcom: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fech_ven_prod_dcom?: Date;

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
  @IsString()
  lote_dcom?: string;

  @IsOptional()
  @IsNumber()
  cant_usada_dcom?: number;

  @IsOptional()
  @IsNumber()
  cant_disponible_dcom?: number;

  @IsOptional()
  @IsEnum(EstadoLote)
  est_lote_dcom?: EstadoLote;
}
