import { PartialType } from '@nestjs/mapped-types';
import { CreateTransformacionDto } from './create-transformacion.dto';

export class UpdateTransformacionDto extends PartialType(CreateTransformacionDto) {}
