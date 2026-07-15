import { Type } from 'class-transformer';
import { IsBooleanString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class ListProjectsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @IsOptional()
  @IsString()
  search?: string; // kode, nama proyek, nama client

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  picId?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsBooleanString()
  overbudget?: string; // "true" | "false"

  @IsOptional()
  @IsString()
  sort: string = 'code'; // default sort by code (§7.1.4, §12.7)

  @IsOptional()
  @IsString()
  order: 'asc' | 'desc' = 'asc';
}
