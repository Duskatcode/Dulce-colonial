import { IsDateString, IsOptional } from 'class-validator';

export class ReportRangeDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
