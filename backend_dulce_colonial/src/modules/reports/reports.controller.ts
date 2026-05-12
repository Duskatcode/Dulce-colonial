import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsIn } from 'class-validator';

class ManualReportDto {
  @IsIn(['stock', 'movements', 'lowstock'])
  type: 'stock' | 'movements' | 'lowstock';
}

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Historial de reportes generados' })
  findAll() {
    return this.reportsService.findAll();
  }

  @Get('stock')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Reporte de stock actual (JSON)' })
  stockReport() {
    return this.reportsService.generateStockReport();
  }

  @Get('movements')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Reporte de movimientos (JSON)' })
  movementsReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.generateMovementsReport(dateFrom, dateTo);
  }

  @Get('low-stock')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Reporte de bajo inventario (JSON)' })
  lowStockReport() {
    return this.reportsService.generateLowStockReport();
  }

  @Post('manual')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Generar reporte manual y subir a Drive' })
  manualReport(@Body() dto: ManualReportDto) {
    return this.reportsService.runManualReport(dto.type);
  }
}
