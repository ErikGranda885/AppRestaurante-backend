import { PartialType } from '@nestjs/mapped-types';
import { CreateEquivalenciaDto } from './create-equivalencia.dto';

export class UpdateEquivalenciaDto extends PartialType(CreateEquivalenciaDto) {}
