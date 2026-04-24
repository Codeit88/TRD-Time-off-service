import { IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class CreateTimeOffRequestDto {
  @IsString()
  @MaxLength(64)
  employeeId;

  @IsString()
  @MaxLength(64)
  locationId;

  @IsNumber()
  @Min(0.5)
  days;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey;
}
