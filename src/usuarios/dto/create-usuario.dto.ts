import { IsEmail, IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { IntegerType } from 'typeorm';

export class CreateUsuarioDto {
  @IsNotEmpty()
  @IsString()
  nom_usu: string;

  @IsNotEmpty()
  @IsEmail()
  email_usu: string;

  @IsNotEmpty()
  @IsString()
  clave_usu: string;

  @IsNotEmpty({ message: 'El rol del usuario es obligatorio' })
  @IsNumber()
  rol_usu: number;

  @IsNotEmpty()
  @IsString()
  img_usu: string;
}
