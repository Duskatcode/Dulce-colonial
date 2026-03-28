import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustStockDto {
  @Type(() => Number)
  @IsInt()
  @Min(-1000000)
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reference?: string;
}
