import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { MitigationStrategy, QcStatus, RemediationStatus, RiskCategory, RiskStatus } from '@prisma/client';

export class UpdateQcDto {
  @IsEnum(QcStatus) qcStatus!: QcStatus;
  @IsOptional() @IsString() findings?: string;
  @IsOptional() @IsString() correctiveAction?: string;
  @IsOptional() @IsString() remediationDue?: string;
  @IsOptional() @IsEnum(RemediationStatus) remediationStatus?: RemediationStatus;
  @IsOptional() @IsString() notes?: string;
  /** Required for Waived (Admin only). */
  @IsOptional() @IsString() reason?: string;
}

export class CreateRiskDto {
  @IsString() @MinLength(1, { message: 'Deskripsi risiko wajib diisi.' }) description!: string;
  @IsEnum(RiskCategory) category!: RiskCategory;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) likelihood!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) impact!: number;
  @IsOptional() @IsEnum(MitigationStrategy) mitigationStrategy?: MitigationStrategy;
  @IsOptional() @IsString() mitigationPlan?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) affectedWbsIds?: string[];
}

export class UpdateRiskDto {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(RiskCategory) category?: RiskCategory;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) likelihood?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) impact?: number;
  @IsOptional() @IsEnum(MitigationStrategy) mitigationStrategy?: MitigationStrategy;
  @IsOptional() @IsString() mitigationPlan?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsEnum(RiskStatus) status?: RiskStatus;
  @IsOptional() @IsArray() @IsString({ each: true }) affectedWbsIds?: string[];
}
