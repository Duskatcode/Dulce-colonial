import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  MOVEMENT_ENTITY_VALUES,
  MOVEMENT_TYPE_VALUES,
} from '../movements.constants';
import type {
  MovementEntityValue,
  MovementTypeValue,
} from '../movements.constants';

export class CreateMovementDto {
  @IsIn(MOVEMENT_TYPE_VALUES)
  type: MovementTypeValue;

  @IsIn(MOVEMENT_ENTITY_VALUES)
  entityType: MovementEntityValue;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  entityId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
