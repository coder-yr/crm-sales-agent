import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class DealAnalysisDto {
  @IsNotEmpty()
  @IsString()
  leadId: string;

  @IsOptional()
  @IsString()
  entityType?: string = 'Lead';
}
