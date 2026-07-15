import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { ExecutionStatus } from '@prisma/client';

export class UpdateExecutionDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) actualQty?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) progressPct?: number;

  @IsOptional() @IsEnum(ExecutionStatus) status?: ExecutionStatus;
  @IsOptional() @IsBoolean() isCompleted?: boolean;

  @IsOptional() @IsString() actualStart?: string;
  @IsOptional() @IsString() actualEnd?: string;
  @IsOptional() @IsString() picId?: string;

  /** Required to mark Selesai while % < 100 (§7.2.4 C). */
  @IsOptional() @IsString() reason?: string;
}

export class CostActualDto {
  @IsString() date!: string;
  @IsString() @MinLength(1, { message: 'Uraian wajib diisi.' }) description!: string;
  @Type(() => Number) @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() referenceNo?: string;
  @IsOptional() @IsString() attachmentUrl?: string;
  /** Required when the cost pushes the line over its plan budget and overbudget is allowed. */
  @IsOptional() @IsString() reason?: string;
}
