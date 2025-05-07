import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRolDto {
  @IsNotEmpty()
  @IsString()
  nom_rol: string;

  @IsNotEmpty()
  @IsString()
  desc_rol: string;
}
