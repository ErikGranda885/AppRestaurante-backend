import { IsOptional, IsString } from 'class-validator';

export class FiltroCierreDto {
  @IsOptional()
  @IsString()
  desde?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  hasta?: string;
}
