import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateOutreachDraftDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PROFESSIONAL', 'CASUAL', 'URGENT', 'EXECUTIVE', 'CONSULTATIVE'])
  tone?: 'PROFESSIONAL' | 'CASUAL' | 'URGENT' | 'EXECUTIVE' | 'CONSULTATIVE';
}
