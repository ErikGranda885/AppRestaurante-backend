import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateProveedorDto {
  @IsString()
  @IsNotEmpty()
  nom_prov: string;

  @IsString()
  @IsNotEmpty()
  cont_prov: string;

  @IsString()
  @IsNotEmpty()
  tel_prov: string;

  @IsString()
  @IsNotEmpty()
  direc_prov: string;

  @IsNotEmpty()
  @IsEmail()
  email_prov: string;

  @IsNotEmpty()
  @IsString()
  ruc_prov: string;

  @IsNotEmpty()
  @IsString()
  est_prov: string;

  @IsNotEmpty()
  @IsString()
  img_prov: string;
}
