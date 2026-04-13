import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OpenRegisterDto {
  @ApiProperty({ example: 100000, description: 'Saldo inicial en COP' })
  @IsNumber()
  @Min(0)
  openingBalance: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
