import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Actividad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Historial completo de actividad (solo ADMIN)' })
  findAll(
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.findAll({
      userId: userId ? +userId : undefined,
      entity,
      dateFrom,
      dateTo,
      page: page ? +page : 1,
      limit: limit ? +limit : 30,
    });
  }

  @Get('stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Estadísticas de actividad' })
  getStats() {
    return this.activityService.getStats();
  }

  @Get('user/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actividad de un usuario específico' })
  findByUser(@Param('id', ParseIntPipe) id: number) {
    return this.activityService.findByUser(id);
  }
}
