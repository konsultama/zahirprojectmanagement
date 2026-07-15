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

export class CreateProjectDto {
  @IsString()
  @MinLength(3, { message: 'Nama proyek minimal 3 karakter.' })
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsDateString({}, { message: 'Tanggal mulai tidak valid.' })
  startDate!: string;

  @IsDateString({}, { message: 'Tanggal selesai tidak valid.' })
  finishDate!: string;

  @IsString({ message: 'Client wajib dipilih.' })
  clientId!: string;

  @IsString({ message: 'Penanggung jawab (PIC) wajib dipilih.' })
  picId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  contractValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  initialBudget?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal satu lokasi wajib diisi.' })
  @ValidateNested({ each: true })
  @Type(() => LocationInputDto)
  locations!: LocationInputDto[];
}
