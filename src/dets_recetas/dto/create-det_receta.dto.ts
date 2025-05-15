import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateDetRecetaDto {
  @IsNotEmpty()
  @IsNumber()
  recet_rec: number;

  @IsNotEmpty()
  @IsNumber()
  prod_rec: number;

  @IsNotEmpty()
  @IsNumber()
  cant_rec: number;

  @IsNotEmpty()
  @IsString()
  und_prod_rec: string;
}
