import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGastoDto {
  @IsNotEmpty()
  @IsString()
  desc_gas: string;

  @IsNotEmpty()
  @IsNumber()
  mont_gas: number;

  @IsOptional()
  @Type(() => Date)
  fech_gas?: Date;

  @IsOptional()
  @IsString()
  obs_gas?: string;
}
