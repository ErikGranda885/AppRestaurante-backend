import { IsNotEmpty, IsString } from 'class-validator';

export class CreateConfiguracionDto {
  @IsNotEmpty()
  @IsString()
  clave_conf: string;

  @IsNotEmpty()
  @IsString()
  valor_conf: string;
}
