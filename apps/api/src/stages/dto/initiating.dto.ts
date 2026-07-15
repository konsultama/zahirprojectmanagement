import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { InfluenceLevel } from '@prisma/client';

export class DeliverableDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() targetDate?: string;
}

export class StakeholderDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() contact?: string;
  @IsOptional() @IsString() influence?: InfluenceLevel;
}

export class InitialRiskDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) description!: string;
  @IsOptional() @IsString() impact?: string;
  @IsOptional() @IsString() likelihood?: string;
}

export class SaveInitiatingDto {
  @IsOptional() @IsString() objective?: string;
  @IsOptional() @IsString() inScope?: string;
  @IsOptional() @IsString() outOfScope?: string;

  @IsOptional() @IsArray() @IsString({ each: true }) assumptions?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) constraints?: string[];

  @IsOptional() @Type(() => Number) @IsNumber() initialBudget?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) estimatedDays?: number;
  @IsOptional() @IsString() sponsorApproverId?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DeliverableDto)
  deliverables?: DeliverableDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => StakeholderDto)
  stakeholders?: StakeholderDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => InitialRiskDto)
  initialRisks?: InitialRiskDto[];

  /** Required (BR-3) when editing an already-approved stage. */
  @IsOptional() @IsString() reason?: string;
}

export class ChecklistUpdateDto {
  @IsOptional() @IsBoolean() isChecked?: boolean;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() attachmentUrl?: string;
  @IsOptional() @IsString() reason?: string;
}

export class RejectDto {
  @IsString() @MinLength(1, { message: 'Alasan penolakan wajib diisi.' })
  reason!: string;
}
