import { IsString, IsOptional, ValidateIf } from 'class-validator';

export class SignalDetectionDto {
  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;
}
