import { PartialType } from '@nestjs/mapped-types';
import { CreatePropertyDto } from './create-property.dto';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {
  @IsNumber()
  @IsOptional()
  version?: number;
}
