import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadDto } from './create-lead.dto';
import { IsOptional, IsInt } from 'class-validator';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @IsOptional()
  @IsInt()
  version?: number;
}
