import { IsString, IsOptional, IsNumber } from 'class-validator';

export class AssignLeadDto {
  @IsString()
  assigneeId: string;

  @IsOptional()
  @IsNumber()
  version?: number;
}
