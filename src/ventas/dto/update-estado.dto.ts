// update-estado.dto.ts
import { IsString, IsIn } from 'class-validator';

export class UpdateEstadoDto {
  @IsString()
  @IsIn(['Cerrada', 'Sin cerrar', 'Por validar'])
  est_vent: string;
}
