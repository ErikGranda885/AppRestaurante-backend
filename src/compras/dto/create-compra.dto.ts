import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCompraDto {
  @IsNotEmpty()
  @IsNumber()
  tot_comp: number;

  @IsNotEmpty()
  @IsNumber()
  prov_comp: number;

  @IsNotEmpty()
  @IsNumber()
  usu_comp: number;

  @IsNotEmpty()
  @Type(() => Date)
  fech_comp: Date;

  @IsOptional()
  @IsDate()
  fech_pag_comp?: Date;

  @IsNotEmpty()
  @IsString()
  estado_comp: string;

  @IsOptional()
  @IsString()
  estado_pag_comp?: string;

  @IsOptional()
  @IsString()
  observ_comp?: string;

  @IsNotEmpty()
  @IsString()
  tipo_doc_comp: string;

  @IsNotEmpty()
  @IsString()
  num_doc_comp: string;

  @IsOptional()
  @IsString()
  obs_pago_efec_comp?: string;

  @IsOptional()
  @IsString()
  num_tra_comprob_comp?: string;

  @IsOptional()
  @IsString()
  comprob_tran_comp?: string;

  @IsNotEmpty()
  @IsString()
  form_pag_comp: string;

  @IsNotEmpty()
  @IsString()
  fech_venc_comp: string;
}
