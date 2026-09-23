import { IsString, IsIn } from 'class-validator';

export class UpdateRecommendationStatusDto {
  @IsString()
  @IsIn(['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'])
  status: string;
}
