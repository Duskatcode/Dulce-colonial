import {
  IsString, IsNumber, IsOptional,
  IsPositive, IsEnum, IsInt, Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({
    enum: ['VENTA', 'GASTO', 'INGRESO', 'DEVOLUCION', 'COTIZACION'],
    example: 'VENTA',
  })
  @IsEnum(['VENTA', 'GASTO', 'INGRESO', 'DEVOLUCION', 'COTIZACION'])
  type: string;

  @ApiProperty({ example: 25000, description: 'Monto en COP' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'Venta 5 helados' })
  @IsString()
  description: string;

  @ApiProperty({ required: false, example: 'FAC-001' })
  @IsOptional()
  @IsString()
  reference?: string;

  // Solo para ventas
  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  productId?: number;

  @ApiProperty({ required: false, example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  productQty?: number;
}