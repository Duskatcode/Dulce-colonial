import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AlertsGateway } from './alerts.gateway';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AlertsGateway,
    private readonly config: ConfigService,
  ) {}

  // Verifica stock cada 30 minutos por defecto
  @Cron('*/30 * * * *')
  async checkStockLevels() {
    this.logger.log('🔍 Verificando niveles de stock...');

    // Ingredientes bajo stock mínimo
    const lowIngredients = await this.prisma.ingredient.findMany({
      where: {
        quantity: { lte: this.prisma.ingredient.fields.minStock },
      },
    });

    // Productos agotados o bajo stock
    const lowProducts = await this.prisma.product.findMany({
      where: { stock: { lte: 2 } },
    });

    // Consulta directa con SQL para ingredientes bajo mínimo
    const ingredientsRaw = await this.prisma.$queryRaw<any[]>`
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
      await this.prisma.stockAlert.upsert({
        where: {
          // Crear índice único en schema si se desea evitar duplicados
          id: 0,
        },
        update: {
          currentStock: ing.quantity,
          resolved: false,
        },
        create: {
          entityType: 'ingrediente',
          entityId: ing.id,
          entityName: ing.name,
          currentStock: ing.quantity,
          minStock: ing.minStock,
        },
      }).catch(() => {
        // Si falla el upsert simplemente crea
        this.prisma.stockAlert.create({
          data: {
            entityType: 'ingrediente',
            entityId: ing.id,
            entityName: ing.name,
            currentStock: ing.quantity,
            minStock: ing.minStock,
          },
        });
      });
    }

    // Productos con stock <= 2
    const productsRaw = await this.prisma.$queryRaw<any[]>`
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