import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class ChangeStageDto {
  @IsString()
  @IsNotEmpty()
  stageId: string;

  @IsOptional()
  @IsInt()
  version?: number;
}
