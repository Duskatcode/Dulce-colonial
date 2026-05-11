import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CloseRegisterDto {
  @ApiProperty({ example: 125000, description: 'Saldo físico contado en COP' })
  @IsNumber()
  @Min(0)
  closingBalance: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
