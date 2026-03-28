import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class FilterInventoryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  belowMinStock?: boolean;
}
