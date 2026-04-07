import { IsDateString, IsIn, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { MOVEMENT_ENTITY_VALUES, MOVEMENT_TYPE_VALUES } from '../movements.constants';
import type { MovementEntityValue, MovementTypeValue } from '../movements.constants';

export class FilterMovementsDto {
  @IsOptional()
  @IsIn(MOVEMENT_TYPE_VALUES)
  type?: MovementTypeValue;

  @IsOptional()
  @IsIn(MOVEMENT_ENTITY_VALUES)
  entityType?: MovementEntityValue;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  entityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
