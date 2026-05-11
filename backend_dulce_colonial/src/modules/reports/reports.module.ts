import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportGeneratorService } from './report-generator.service';
import { ExcelReportService } from './excel-report.service';
import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [PrismaModule, DriveModule],
  providers: [ReportsService, ReportGeneratorService, ExcelReportService],
  controllers: [ReportsController],
  exports: [ReportsService, ExcelReportService],
})
export class ReportsModule {}
