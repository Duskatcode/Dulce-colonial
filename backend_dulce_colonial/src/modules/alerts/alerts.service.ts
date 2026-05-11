import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AlertsGateway } from './alerts.gateway';

interface IngredientStockRow {
  id: number;
  name: string;
  quantity: Prisma.Decimal | number;
  minStock: Prisma.Decimal | number;
}

interface ProductStockRow {
  id: number;
  name: string;
  stock: Prisma.Decimal | number;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AlertsGateway,
  ) {}

  // Verifica stock cada 30 minutos por defecto
  @Cron('*/30 * * * *')
  async checkStockLevels() {
    this.logger.log('🔍 Verificando niveles de stock...');

    // Consulta directa con SQL para ingredientes bajo mínimo
    const ingredientsRaw = await this.prisma.$queryRaw<IngredientStockRow[]>`
      SELECT id, name, quantity, min_stock as "minStock", 'ingrediente' as entity_type
      FROM ingredients
      WHERE quantity <= min_stock
    `;

    for (const ing of ingredientsRaw) {
      this.gateway.emitStockAlert({
        entityType: 'ingrediente',
        entityName: ing.name,
        currentStock: Number(ing.quantity),
        minStock: Number(ing.minStock),
      });

      // Guardar alerta en base de datos
      try {
        await this.prisma.stockAlert.upsert({
          where: {
            // Crear índice único en schema si se desea evitar duplicados
            id: 0,
          },
          update: {
            currentStock: Number(ing.quantity),
            resolved: false,
          },
          create: {
            entityType: 'ingrediente',
            entityId: ing.id,
            entityName: ing.name,
            currentStock: Number(ing.quantity),
            minStock: Number(ing.minStock),
          },
        });
      } catch {
        await this.prisma.stockAlert.create({
          data: {
            entityType: 'ingrediente',
            entityId: ing.id,
            entityName: ing.name,
            currentStock: Number(ing.quantity),
            minStock: Number(ing.minStock),
          },
        });
      }
    }

    // Productos con stock <= 2
    const productsRaw = await this.prisma.$queryRaw<ProductStockRow[]>`
      SELECT id, name, stock, 2 as "minStock"
      FROM products
      WHERE stock <= 2 AND status != 'INACTIVO'
    `;

    for (const prod of productsRaw) {
      this.gateway.emitStockAlert({
        entityType: 'producto',
        entityName: prod.name,
        currentStock: Number(prod.stock),
        minStock: 2,
      });
    }

    const total = ingredientsRaw.length + productsRaw.length;
    if (total > 0) {
      this.logger.warn(`⚠️  ${total} alertas de stock emitidas`);
    } else {
      this.logger.log('✅ Stock en niveles normales');
    }
  }

  async getActiveAlerts() {
    return this.prisma.stockAlert.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveAlert(id: number) {
    return this.prisma.stockAlert.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date() },
    });
  }
}
