import { IsString, IsEmail, IsOptional, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  interestedProperty?: string;

  @IsString()
  @IsOptional()
  preapprovalStatus?: string;

  @IsDateString()
  @IsOptional()
  expectedCloseDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsNotEmpty()
  stageId: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;
}
