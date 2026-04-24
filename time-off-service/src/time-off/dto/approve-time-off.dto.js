import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveTimeOffDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  note;
}
