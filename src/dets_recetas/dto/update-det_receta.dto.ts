import { PartialType } from "@nestjs/mapped-types";
import { CreateDetRecetaDto } from "./create-det_receta.dto";

export class UpdateDetRecetaDto extends PartialType(CreateDetRecetaDto) {}