import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { DocumentStatus } from '@prisma/client';

export class UpdateDocumentDto {
  @IsOptional() @IsEnum(DocumentStatus) status?: DocumentStatus;
  @IsOptional() @IsString() documentNo?: string;
  @IsOptional() @IsString() documentDate?: string;
  @IsOptional() @IsString() fileUrl?: string;
  @IsOptional() @IsString() notes?: string;
  /** Required to set a mandatory doc as Tidak Berlaku (§7.2.6 B). */
  @IsOptional() @IsString() waiverReason?: string;
}

export class CreateDocumentDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsBoolean() isRequired?: boolean;
}

export class EvaluationDto {
  @IsOptional() @IsString() lessonsLearned?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) vendorRating?: number;
  @IsOptional() @IsString() vendorNotes?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) clientRating?: number;
  @IsOptional() @IsString() clientNotes?: string;
}

export class MasterUpdateDto {
  @IsOptional() @IsString() actualFinishDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) progressPct?: number;
  @IsOptional() @IsString() progressReason?: string;
  @IsOptional() @Type(() => Number) @IsNumber() contractValue?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() picId?: string;
}
