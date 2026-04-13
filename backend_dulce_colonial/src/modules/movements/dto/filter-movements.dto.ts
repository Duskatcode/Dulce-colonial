import { IsDateString, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  MOVEMENT_ENTITY_VALUES,
  MOVEMENT_TYPE_VALUES,
} from '../movements.constants';
import type {
  MovementEntityValue,
  MovementTypeValue,
} from '../movements.constants';

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
