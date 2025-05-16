import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class IngredienteDto {
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredienteDto)
  ingredientes: IngredienteDto[];
}
