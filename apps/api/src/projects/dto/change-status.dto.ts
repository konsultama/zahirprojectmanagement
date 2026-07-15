import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class ChangeStatusDto {
  @IsEnum(ProjectStatus, { message: 'Status target tidak valid.' })
  status!: ProjectStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
