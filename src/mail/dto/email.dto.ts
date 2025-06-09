import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class EnviarEmailDto {
  @IsEmail({}, { message: 'El destinatario debe ser un correo válido' })
  @IsNotEmpty({ message: 'El campo "recipients" es obligatorio' })
  recipients: string;

  @IsString({ message: 'El asunto debe ser un texto' })
  @IsNotEmpty({ message: 'El campo "subject" es obligatorio' })
  subject: string;

  @IsString({ message: 'El contenido HTML debe ser un texto' })
  @IsNotEmpty({ message: 'El campo "html" es obligatorio' })
  html: string;
}
