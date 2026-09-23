import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class ResearchAgentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Lead', 'Company'])
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;
}
