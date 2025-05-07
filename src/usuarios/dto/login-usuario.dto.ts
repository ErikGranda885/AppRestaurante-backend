import { IsString, IsNotEmpty } from 'class-validator';

export class LoginUsuarioDto {
  @IsString()
  @IsNotEmpty()
  email_usu: string;

  @IsString()
  @IsNotEmpty()
  clave_usu: string;
}
