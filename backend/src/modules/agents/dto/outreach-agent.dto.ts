import { IsNotEmpty, IsOptional, IsString, IsUUID, IsIn } from 'class-validator';

export class OutreachAgentDto {
  @IsNotEmpty()
  @IsUUID()
  leadId: string;

  @IsOptional()
  @IsUUID()
  recommendationId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PROFESSIONAL', 'CASUAL', 'URGENT', 'EXECUTIVE', 'CONSULTATIVE'])
  tone?: 'PROFESSIONAL' | 'CASUAL' | 'URGENT' | 'EXECUTIVE' | 'CONSULTATIVE';
}
