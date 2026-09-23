import { IsString, IsNotEmpty, IsOptional, IsObject, IsIn } from 'class-validator';

export class CreateAgentRunDto {
  @IsString()
  @IsNotEmpty()
  agentType: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['Lead', 'Company', 'Contact'])
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, any>;

  @IsOptional()
  @IsString()
  @IsIn(['PERMANENT', 'TRANSIENT'])
  _forceFailureType?: string;
}
