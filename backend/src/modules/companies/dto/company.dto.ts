import { IsString, IsOptional, IsInt, IsNumber, IsUrl, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsInt()
  @IsOptional()
  employeeCount?: number;

  @IsNumber()
  @IsOptional()
  revenue?: number;

  @IsInt()
  @IsOptional()
  foundedYear?: number;

  @IsUrl()
  @IsOptional()
  websiteUrl?: string;
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
