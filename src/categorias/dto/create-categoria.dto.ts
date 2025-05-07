import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoriaDto {
  @IsNotEmpty()
  @IsString()
  nom_cate: string;

  @IsOptional()
  @IsString()
  desc_cate?: string;
}
