import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateChannelPartnerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  contactInfo?: string;

  @IsString()
  @IsOptional()
  primaryContact?: string;

  @IsOptional()
  activeAgents?: number;

  @IsOptional()
  commissionRate?: number;
}
