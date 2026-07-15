import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { WbsItemType } from '@prisma/client';

/** Leaf item type; parent rows are always GROUP (set by the server). */
export enum LeafType {
  TASK = 'TASK',
  MATERIAL = 'MATERIAL',
}

export class CreateWbsDto {
  @IsOptional() @IsString() parentId?: string; // null/absent = root activity

  @IsString() @MinLength(1) @MaxLength(200) name!: string;

  @IsEnum(LeafType, { message: 'Tipe harus Task atau Material.' })
  itemType!: LeafType;

  @IsOptional() @IsString() locationId?: string; // inherited from parent/project if omitted

  @IsOptional() @IsString() uom?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) qty?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitBudget?: number;

  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;

  @IsOptional() @IsBoolean() isQcRequired?: boolean;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpdateWbsDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string;
  @IsOptional() @IsEnum(WbsItemType) itemType?: WbsItemType;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() uom?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) qty?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitBudget?: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) weightPct?: number;
  @IsOptional() @IsString() picId?: string;
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsBoolean() isQcRequired?: boolean;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsString() reason?: string; // required when Planning already approved (BR-3)
}

export class OverbudgetDto {
  @IsBoolean() allowOverbudget!: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tolerancePct?: number;
  @IsOptional() @IsString() reason?: string;
}
