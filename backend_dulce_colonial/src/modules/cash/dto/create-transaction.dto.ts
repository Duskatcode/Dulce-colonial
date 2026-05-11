import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
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
  @Type(() => Number)
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
  @Type(() => Number)
  @IsInt()
  productId?: number;

  @ApiProperty({ required: false, example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productQty?: number;

  @ApiProperty({
    required: false,
    example: false,
    description: 'Genera factura en la misma operación de venta',
  })
  @IsOptional()
  @IsBoolean()
  generateInvoice?: boolean;
}
