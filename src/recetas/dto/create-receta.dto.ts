import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateRecetaDto {
  @IsNotEmpty()
  @IsNumber()
  prod_rec: number;

  @IsNotEmpty()
  @IsString()
  nom_rec: string;

  @IsNotEmpty()
  @IsString()
  desc_rec: string;
}
