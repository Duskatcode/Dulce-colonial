import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { DriveService } from '../drive/drive.service';
import { ReportGeneratorService } from './report-generator.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly drive: DriveService,
    private readonly generator: ReportGeneratorService,
  ) {}

  // ─── Reporte diario automático (11:00 PM) ─────────────────────────────────
  @Cron('0 23 * * *')
  async runDailyReport() {
    this.logger.log('📊 Iniciando reporte diario automático...');
    await this.generateAndUploadStockReport('reportes-diarios');
  }

  // ─── Reporte semanal automático (domingos 11:30 PM) ──────────────────────
  @Cron('30 23 * * 0')
  async runWeeklyReport() {
    this.logger.log('📊 Iniciando reporte semanal automático...');
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    await this.generateAndUploadMovementsReport(
      weekAgo.toISOString(),
      now.toISOString(),
      'reportes-semanales',
    );
  }

  // ─── Reporte al cerrar el servidor ───────────────────────────────────────
  async runShutdownReport() {
    this.logger.log('📊 Generando reporte de cierre...');
    await this.generateAndUploadLowStockReport('respaldos-manuales');
  }

  // ─── Reporte manual (desde el panel) ─────────────────────────────────────
  async runManualReport(type: 'stock' | 'movements' | 'lowstock') {
    this.logger.log(`📊 Reporte manual solicitado: ${type}`);
    switch (type) {
      case 'stock':
        return this.generateAndUploadStockReport('respaldos-manuales');
      case 'movements':
        return this.generateAndUploadMovementsReport(
          undefined,
          undefined,
          'respaldos-manuales',
        );
      case 'lowstock':
        return this.generateAndUploadLowStockReport('respaldos-manuales');
    }
  }

  // ─── Reintentar pendientes (cron cada hora) ───────────────────────────────
  @Cron('0 * * * *')
  async retryPendingUploads() {
    const pending = await this.prisma.report.findMany({
      where: { status: 'PENDIENTE_DRIVE' },
      take: 5,
    });

    if (pending.length === 0) return;
    this.logger.log(`🔄 Reintentando ${pending.length} reportes pendientes...`);

    for (const report of pending) {
      await this.uploadReportToDrive(report.id);
    }
  }

  // ─── Lógica de generación + subida ───────────────────────────────────────
  private async generateAndUploadStockReport(
    folderKey:
      | 'reportes-diarios'
      | 'reportes-semanales'
      | 'reportes-mensuales'
      | 'respaldos-manuales',
  ) {
    const [products, ingredients] = await this.prisma.$transaction([
      this.prisma.product.findMany({ orderBy: { category: 'asc' } }),
      this.prisma.ingredient.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const localPath = await this.generator.generateStockExcel({
      products,
      ingredients,
    });
    const fileName =
      localPath.split('/').pop() || localPath.split('\\').pop() || localPath;

    const report = await this.prisma.report.create({
      data: {
        type: 'STOCK_ACTUAL',
        fileName,
        localPath,
        status: 'GENERADO',
      },
    });

    await this.uploadReportToDrive(report.id, folderKey);
    return report;
  }

  private async generateAndUploadMovementsReport(
    dateFrom?: string,
    dateTo?: string,
    folderKey:
      | 'reportes-diarios'
      | 'reportes-semanales'
      | 'reportes-mensuales'
      | 'respaldos-manuales' = 'respaldos-manuales',
  ) {
    const where: Prisma.MovementWhereInput = {};
    if (dateFrom || dateTo) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (dateFrom) createdAtFilter.gte = new Date(dateFrom);
      if (dateTo) createdAtFilter.lte = new Date(dateTo);
      where.createdAt = createdAtFilter;
    }

    const movements = await this.prisma.movement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        product: { select: { name: true } },
        ingredient: { select: { name: true, unit: true } },
      },
    });

    const period = dateFrom
      ? `${dateFrom.split('T')[0]}_${dateTo?.split('T')[0]}`
      : 'completo';

    const localPath = await this.generator.generateMovementsExcel(
      movements,
      period,
    );
    const fileName =
      localPath.split('/').pop() || localPath.split('\\').pop() || localPath;

    const report = await this.prisma.report.create({
      data: {
        type: 'MOVIMIENTOS',
        fileName,
        localPath,
        status: 'GENERADO',
      },
    });

    await this.uploadReportToDrive(report.id, folderKey);
    return report;
  }

  private async generateAndUploadLowStockReport(
    folderKey:
      | 'reportes-diarios'
      | 'reportes-semanales'
      | 'reportes-mensuales'
      | 'respaldos-manuales',
  ) {
    const [lowProducts, lowIngredients] = await Promise.all([
      this.prisma.product.findMany({
        where: { stock: { lte: 2 }, status: { not: 'INACTIVO' } },
        orderBy: { stock: 'asc' },
      }),
      this.prisma.$queryRaw<
        Array<{
          id: number;
          name: string;
          quantity: Prisma.Decimal | number;
          min_stock: Prisma.Decimal | number;
          unit: string;
        }>
      >`
        SELECT * FROM ingredients WHERE quantity <= min_stock ORDER BY quantity ASC
      `,
    ]);

    const localPath = await this.generator.generateLowStockPDF({
      lowProducts,
      lowIngredients,
    });
    const fileName =
      localPath.split('/').pop() || localPath.split('\\').pop() || localPath;

    const report = await this.prisma.report.create({
      data: {
        type: 'BAJO_INVENTARIO',
        fileName,
        localPath,
        status: 'GENERADO',
      },
    });

    await this.uploadReportToDrive(report.id, folderKey);
    return report;
  }

  // ─── Subir a Drive + actualizar BD ───────────────────────────────────────
  private async uploadReportToDrive(
    reportId: number,
    folderKey:
      | 'reportes-diarios'
      | 'reportes-semanales'
      | 'reportes-mensuales'
      | 'respaldos-manuales' = 'respaldos-manuales',
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) return;

    const isExcel = report.fileName.endsWith('.xlsx');
    const mimeType = isExcel
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';

    try {
      const result = await this.drive.uploadFileToFolder(
        report.localPath,
        report.fileName,
        folderKey,
        mimeType,
      );

      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'SUBIDO_DRIVE',
          driveId: result.id,
          driveUrl: result.webViewLink,
          uploadedAt: new Date(),
        },
      });

      await this.prisma.driveLog.create({
        data: { reportId, success: true },
      });

      this.logger.log(
        `☁️  Reporte ${report.fileName} subido exitosamente a Drive`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Marcar como pendiente para reintento
      await this.prisma.report.update({
        where: { id: reportId },
        data: { status: 'PENDIENTE_DRIVE' },
      });

      const attempts = await this.prisma.driveLog.count({
        where: { reportId },
      });
      await this.prisma.driveLog.create({
        data: {
          reportId,
          success: false,
          error: errorMessage,
          attempt: attempts + 1,
        },
      });

      this.logger.warn(
        `⚠️  No se pudo subir ${report.fileName} a Drive. Queda pendiente para reintento.`,
      );
    }
  }

  // ─── Endpoints de consulta ────────────────────────────────────────────────
  async findAll() {
    return this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async generateStockReport() {
    const [products, ingredients] = await this.prisma.$transaction([
      this.prisma.product.findMany({ orderBy: { category: 'asc' } }),
      this.prisma.ingredient.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      products: {
        total: products.length,
        active: products.filter((p) => p.status === 'ACTIVO').length,
        outOfStock: products.filter((p) => p.status === 'AGOTADO').length,
        data: products,
      },
      ingredients: {
        total: ingredients.length,
        belowMinStock: ingredients.filter(
          (i) => Number(i.quantity) <= Number(i.minStock),
        ).length,
        data: ingredients,
      },
    };
  }

  async generateMovementsReport(dateFrom?: string, dateTo?: string) {
    const where: Prisma.MovementWhereInput = {};
    if (dateFrom || dateTo) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (dateFrom) createdAtFilter.gte = new Date(dateFrom);
      if (dateTo) createdAtFilter.lte = new Date(dateTo);
      where.createdAt = createdAtFilter;
    }
    const movements = await this.prisma.movement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        product: { select: { name: true, category: true } },
        ingredient: { select: { name: true, unit: true } },
      },
    });
    return {
      generatedAt: new Date().toISOString(),
      total: movements.length,
      data: movements,
    };
  }

  async generateLowStockReport() {
    const [lowProducts, lowIngredients] = await Promise.all([
      this.prisma.product.findMany({
        where: { stock: { lte: 2 }, status: { not: 'INACTIVO' } },
        orderBy: { stock: 'asc' },
      }),
      this.prisma.$queryRaw<
        Array<{
          id: number;
          name: string;
          quantity: Prisma.Decimal | number;
          min_stock: Prisma.Decimal | number;
          unit: string;
        }>
      >`
        SELECT * FROM ingredients WHERE quantity <= min_stock ORDER BY quantity ASC
      `,
    ]);
    return {
      generatedAt: new Date().toISOString(),
      lowProducts: { total: lowProducts.length, data: lowProducts },
      lowIngredients: { total: lowIngredients.length, data: lowIngredients },
    };
  }
}
