import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { FilterMovementsDto } from './dto/filter-movements.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Movimientos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Get()
  findAll(@Query() filters: FilterMovementsDto) {
    return this.movementsService.findAll(filters);
  }

  @Get('summary')
  summary(@Query() filters: FilterMovementsDto) {
    return this.movementsService.getSummary(filters);
  }

  @Post()
  @Roles(Role.ADMIN, Role.OPERADOR)
  create(
    @Body() dto: CreateMovementDto,
    @CurrentUser('id') userId?: number,
  ) {
    return this.movementsService.create(dto, userId);
  }
}
