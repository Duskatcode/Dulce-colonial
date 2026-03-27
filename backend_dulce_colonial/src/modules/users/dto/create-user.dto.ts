import { IsEmail, IsString, IsEnum, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'María López' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'maria@dulcecolonial.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Segura123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'La contraseña debe tener al menos una mayúscula y un número',
  })
  password: string;

  @ApiProperty({ enum: Role, default: Role.OPERADOR })
  @IsEnum(Role)
  role: Role;
}
