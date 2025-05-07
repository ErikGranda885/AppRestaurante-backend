import { PartialType } from '@nestjs/mapped-types';
import { CreateDetVentaDto } from './create-det_venta.dto';

export class UpdateDetVentaDto extends PartialType(CreateDetVentaDto) {}
