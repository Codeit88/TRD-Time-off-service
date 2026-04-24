import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class BatchBalanceItemDto {
  @IsString()
  @MaxLength(64)
  employeeId;

  @IsString()
  @MaxLength(64)
  locationId;

  @IsNumber()
  availableDays;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sourceToken;
}

export class BatchBalanceIngestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchBalanceItemDto)
  items;
}
