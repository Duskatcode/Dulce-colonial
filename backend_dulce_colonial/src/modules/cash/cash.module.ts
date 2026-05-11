import { Module } from '@nestjs/common';
import { CashService } from './cash.service';
import { CashController } from './cash.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { ReportsModule } from '../reports/reports.module';
import { DriveModule } from '../drive/drive.module';
import { ExcelReportService } from '../reports/excel-report.service';

@Module({
  imports: [PrismaModule, AlertsModule, ReportsModule, DriveModule],
  providers: [CashService, ExcelReportService],
  controllers: [CashController],
  exports: [CashService],
})
export class CashModule {}
