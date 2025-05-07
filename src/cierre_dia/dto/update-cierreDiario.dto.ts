import { PartialType } from '@nestjs/mapped-types';
import { CreateCierreDiarioDto } from './create-cierreDiario.dto';

export class UpdateCierreDiarioDto extends PartialType(CreateCierreDiarioDto) {}
