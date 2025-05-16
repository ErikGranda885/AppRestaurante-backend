import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateEquivalenciaDto {
  @IsNotEmpty()
  @IsNumber()
  prod_equiv: number;

  @IsNotEmpty()
  @IsString()
  und_prod_equiv: string;

  @IsNotEmpty()
  @IsNumber()
  cant_equiv: number;

  @IsOptional()
  @IsString()
  est_equiv?: string;
}
