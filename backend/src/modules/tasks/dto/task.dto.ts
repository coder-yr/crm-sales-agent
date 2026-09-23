import { IsString, IsNotEmpty, IsDateString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  leadId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;
}

export class UpdateTaskDto {
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @IsInt()
  @IsOptional()
  version?: number;
}
