import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementEntity, MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AlertsGateway } from '../alerts/alerts.gateway';
import { CreateMovementDto } from './dto/create-movement.dto';
import { FilterMovementsDto } from './dto/filter-movements.dto';

@Injectable()
export class MovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  async findAll(filters: FilterMovementsDto) {
    const where: Prisma.MovementWhereInput = {};
    if (filters.type) where.type = filters.type;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) {
      if (filters.entityType === MovementEntity.INGREDIENTE) {
        where.ingredientId = filters.entityId;
      } else if (filters.entityType === MovementEntity.PRODUCTO) {
        where.productId = filters.entityId;
      } else {
        where.OR = [{ productId: filters.entityId }, { ingredientId: filters.entityId }];
      }
    }
    if (filters.userId) where.userId = filters.userId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    return this.prisma.movement.findMany({
      where,
      include: {
        product: true,
        ingredient: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSummary(filters: FilterMovementsDto) {
    const where: Prisma.MovementWhereInput = {};
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    return this.prisma.movement.groupBy({
      by: ['type'],
      where,
      _count: { type: true },
      _sum: { quantity: true, delta: true },
    });
  }

  async create(dto: CreateMovementDto, userId?: number) {
    const delta = this.calculateDelta(dto.type, dto.quantity);

    return this.prisma.$transaction(async (tx) => {
      let targetName = '';
      let currentStock = 0;
      let minStock = 0;

      if (dto.entityType === MovementEntity.PRODUCTO) {
        const product = await tx.product.findUnique({ where: { id: dto.entityId } });
        if (!product) throw new NotFoundException('Producto no encontrado para el movimiento');
        const newStock = product.stock + delta;
        if (newStock < 0) throw new BadRequestException('El movimiento dejaría stock negativo');
        const updated = await tx.product.update({
          where: { id: dto.entityId },
          data: { stock: newStock },
        });
        targetName = updated.name;
        currentStock = updated.stock;
        minStock = updated.minStock ?? 0;
      } else {
        const ingredient = await tx.ingredient.findUnique({ where: { id: dto.entityId } });
        if (!ingredient) throw new NotFoundException('Ingrediente no encontrado para el movimiento');
        const newQuantity = ingredient.quantity + delta;
        if (newQuantity < 0) throw new BadRequestException('El movimiento dejaría stock negativo');
        const updated = await tx.ingredient.update({
          where: { id: dto.entityId },
          data: { quantity: newQuantity },
        });
        targetName = updated.name;
        currentStock = updated.quantity;
        minStock = updated.minStock ?? 0;
      }

      const movement = await tx.movement.create({
        data: {
          type: dto.type,
          entityType: dto.entityType,
          quantity: dto.quantity,
          delta,
          notes: dto.notes,
          productId: dto.entityType === MovementEntity.PRODUCTO ? dto.entityId : null,
          ingredientId: dto.entityType === MovementEntity.INGREDIENTE ? dto.entityId : null,
          userId,
        },
        include: {
          product: true,
          ingredient: true,
        },
      });

      this.emitAlertIfNeeded(dto.entityType, targetName, currentStock, minStock);
      return movement;
    });
  }

  calculateDelta(type: MovementType, quantity: number) {
    switch (type) {
      case MovementType.ENTRADA:
        return quantity;
      case MovementType.SALIDA:
      case MovementType.MERMA:
        return -quantity;
      case MovementType.AJUSTE:
      default:
        return quantity;
    }
  }

  private emitAlertIfNeeded(entityType: MovementEntity, name: string, current: number, minStock: number) {
    const threshold = minStock > 0 ? minStock : 2;
    if (current <= threshold) {
      this.alertsGateway.emitStockAlert({
        entityType: entityType === MovementEntity.PRODUCTO ? 'producto' : 'ingrediente',
        entityName: name,
        currentStock: current,
        minStock: threshold,
      });
    }
  }
}
