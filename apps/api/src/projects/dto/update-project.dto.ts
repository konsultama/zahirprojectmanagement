import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocationInputDto } from './location.dto';

/**
 * Partial update. `code`, `progressPct`, `status`, and computed budgets are
 * intentionally NOT editable here (§7.1.1): code is immutable, progress/budget
 * are computed, and status moves via the dedicated transition endpoint.
 */
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  finishDate?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  picId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  contractValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  initialBudget?: number;

  /** When provided, replaces the location set (min 1). Omit to leave unchanged. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal satu lokasi wajib diisi.' })
  @ValidateNested({ each: true })
  @Type(() => LocationInputDto)
  locations?: LocationInputDto[];

  /** Required when editing a project whose stage/data is already approved (BR-3). */
  @IsOptional()
  @IsString()
  reason?: string;
}
