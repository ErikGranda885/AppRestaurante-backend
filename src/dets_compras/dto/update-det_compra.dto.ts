import { PartialType } from '@nestjs/mapped-types';
import { CreateDetCompraDto } from './create-det_compra.dto';

export class UpdateDetCompraDto extends PartialType(CreateDetCompraDto) {}
