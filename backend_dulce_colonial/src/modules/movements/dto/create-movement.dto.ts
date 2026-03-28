import { MovementEntity, MovementType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMovementDto {
  @IsEnum(MovementType)
  type: MovementType;

  @IsEnum(MovementEntity)
  entityType: MovementEntity;

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
