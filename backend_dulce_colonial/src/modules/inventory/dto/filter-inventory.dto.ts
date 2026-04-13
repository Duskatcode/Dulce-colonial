import { IsBoolean, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
