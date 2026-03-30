import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DriveService } from './drive.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Drive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get('status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Estado de conexión con Google Drive' })
  status() {
    return { connected: this.driveService.ready };
  }

  @Get('files/daily')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Archivos en carpeta reportes-diarios' })
  listDaily() {
    return this.driveService.listFiles('reportes-diarios');
  }

  @Get('files/weekly')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Archivos en carpeta reportes-semanales' })
  listWeekly() {
    return this.driveService.listFiles('reportes-semanales');
  }

  @Get('files/manual')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Archivos en carpeta respaldos-manuales' })
  listManual() {
    return this.driveService.listFiles('respaldos-manuales');
  }
}