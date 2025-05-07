import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCierreDiarioDto {
  @IsDateString() // formato "YYYY-MM-DD"
  fech_cier: string;

  @IsNotEmpty()
  @IsNumber()
  tot_vent_cier: number;

  @IsOptional()
  @IsNumber()
  tot_dep_cier?: number;

  @IsNotEmpty()
  @IsNumber()
  tot_gas_cier: number;

  @IsNotEmpty()
  @IsNumber()
  tot_compras_pag_cier: number;

  @IsNotEmpty()
  @IsNumber()
  dif_cier: number;

  @IsOptional()
  @IsString()
  comp_dep_cier?: string;

  @IsOptional()
  @IsString()
  fech_reg_cier?: string;

  @IsOptional()
  @IsNumber()
  usu_cier?: number | null;

  @IsOptional()
  @IsString()
  esta_cier?: string;
}
