import { IsNotEmpty, IsUUID } from 'class-validator';

export class RecommendationsAnalysisDto {
  @IsNotEmpty()
  @IsUUID()
  leadId: string;
}
