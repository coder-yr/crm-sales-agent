import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsEmail()
  @IsOptional()
  supportEmail?: string;

  @IsString()
  @IsOptional()
  officialPhone?: string;

  @IsString()
  @IsOptional()
  logo?: string;
}
