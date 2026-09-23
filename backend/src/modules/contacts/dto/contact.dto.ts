import { IsString, IsOptional, IsEmail, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

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
  title?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  seniority?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  decisionMakerScore?: number;
}

export class UpdateContactDto extends PartialType(CreateContactDto) {}
