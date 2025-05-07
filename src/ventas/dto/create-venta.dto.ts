import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVentaDto {
  @IsNotEmpty({
    message: 'El usuario responsable del comprobante es necesario',
  })
  @IsNumber()
  usu_vent: number;

  @IsNotEmpty()
  @Type(() => Date) 
  fech_vent: Date;

  @IsOptional()
  @IsNumber()
  efe_recibido_vent?: number;

  @IsOptional()
  @IsNumber()
  efe_cambio_vent?: number;

  @IsNotEmpty()
  @IsNumber()
  tot_vent: number;

  @IsNotEmpty()
  @IsString()
  tip_pag_vent: string;

  @IsOptional()
  @IsString()
  est_vent?: string | null;

  @IsOptional()
  @IsString()
  comprobante_num_vent?: string | null;

  @IsOptional()
  @IsString()
  comprobante_img_vent?: string | null;
}
