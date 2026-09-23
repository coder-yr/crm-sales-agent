import { IsString, IsNotEmpty, IsInt } from 'class-validator';

export class CreatePipelineStageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  order: number;
}
