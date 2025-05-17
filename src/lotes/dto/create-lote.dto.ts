import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateLoteDto {
  @IsNotEmpty()
  @IsNumber()
  prod_lote: number;

  @IsNotEmpty()
  @IsNumber()
  cant_tot_lote: number;

  @IsNotEmpty()
  @IsNumber()
  cant_usad_lote: number;

  @IsNotEmpty()
  @IsNumber()
  cant_disp_lote: number;

  @IsOptional()
  @IsDate()
  fecha_venc_lote?: Date| null;

  @IsNotEmpty()
  @IsEnum(['vigente', 'por_vencer', 'vencido'])
  esta_lote: 'vigente' | 'por_vencer' | 'vencido';

  @IsNotEmpty()
  @IsEnum(['compra', 'transformacion'])
  orig_lote: 'compra' | 'transformacion';

  @IsNotEmpty()
  @IsNumber()
  id_origen: number;
}
