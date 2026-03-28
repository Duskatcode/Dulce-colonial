import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustQuantityDto {
  @Type(() => Number)
  @IsInt()
  @Min(-1000000)
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
