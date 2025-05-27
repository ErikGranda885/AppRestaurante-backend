import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProductoDto {
  @IsOptional()
  @IsNumber()
  cate_prod?: number;

  @IsNotEmpty()
  @IsString()
  nom_prod: string;

  @IsNotEmpty()
  @IsString()
  tip_prod: string;

  @IsNotEmpty()
  @IsString()
  und_prod: string;

  @IsOptional()
  @IsNumber()
  prec_vent_prod?: number;

  @IsOptional()
  @IsNumber()
  prec_comp_prod?: number;

  @IsOptional()
  @IsNumber()
  stock_prod?: number;

  @IsNotEmpty()
  @IsString()
  img_prod: string;

  @IsOptional()
  @IsString()
  est_prod?: string;

  @IsOptional()
  @IsNumber()
  iva_prod?: number;

  // 👇 Este se usará para el lote
  @IsOptional()
  @IsDateString()
  fecha_venc_lote?: string;
}
