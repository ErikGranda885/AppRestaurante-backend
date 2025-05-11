import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEmpresaDto {
  @IsNotEmpty()
  @IsString()
  nom_emp: string;

  @IsNotEmpty()
  @IsString()
  ruc_emp: string;

  @IsNotEmpty()
  @IsString()
  dir_emp: string;

  @IsNotEmpty()
  @IsString()
  tel_emp: string;

  @IsNotEmpty()
  @IsString()
  corre_emp: string;

  @IsNotEmpty()
  @IsString()
  logo_emp: string;
}
