import { IsString, IsOptional, IsNumber, Min, Max, IsUrl, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateSignalDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  strength: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @IsString()
  @IsNotEmpty()
  source: string;

  @IsUrl()
  @IsOptional()
  sourceUrl?: string;

  @IsDateString()
  @IsOptional()
  detectedAt?: string;
}
