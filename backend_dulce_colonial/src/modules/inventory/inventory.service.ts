import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AlertsGateway } from '../alerts/alerts.gateway';
import { FilterInventoryDto } from './dto/filter-inventory.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { AdjustQuantityDto } from './dto/adjust-quantity.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  async findAll(filters: FilterInventoryDto) {
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 20);
    const skip = (page - 1) * limit;
    const where: Prisma.IngredientWhereInput = {};

    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.unit) {
      where.unit = { equals: filters.unit, mode: 'insensitive' };
    }

    const orderBy = { updatedAt: 'desc' as const };

    if (filters.belowMinStock) {
      const rows = await this.prisma.ingredient.findMany({ where, orderBy });
      const filtered = rows.filter((item) => item.quantity <= item.minStock);
      const total = filtered.length;
      const data = filtered
        .slice(skip, skip + limit)
        .map((ingredient) => this.formatIngredientResponse(ingredient));
      return this.buildPaginatedResponse(data, total, page, limit);
    }

    const [rows, total] = await Promise.all([
      this.prisma.ingredient.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.ingredient.count({ where }),
    ]);

    const data = rows.map((ingredient) =>
      this.formatIngredientResponse(ingredient),
    );
    return this.buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: number) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
    });
    if (!ingredient)
      throw new NotFoundException(`Ingrediente #${id} no encontrado`);
    return ingredient;
  }

  create(dto: CreateIngredientDto) {
    const data = this.mapObservations(dto);
    return this.prisma.ingredient.create({ data });
  }

  async update(id: number, dto: UpdateIngredientDto) {
    await this.findOne(id);
    const data = this.mapObservations(dto);
    const ingredient = await this.prisma.ingredient.update({
      where: { id },
      data,
    });
    this.emitLowStockIfNeeded(ingredient);
    return ingredient;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.ingredient.delete({ where: { id } });
    return { message: `Ingrediente #${id} eliminado` };
  }

  async getUnits() {
    const rows = await this.prisma.ingredient.findMany({
      distinct: ['unit'],
      select: { unit: true },
      orderBy: { unit: 'asc' },
    });
    return rows.map((row) => row.unit);
  }

  async getRawBelowMinimum() {
    return this.prisma.$queryRaw<
      { id: number; name: string; quantity: number; minStock: number }[]
    >`SELECT id, name, quantity, min_stock AS "minStock" FROM "Ingredient" WHERE quantity < min_stock ORDER BY quantity ASC`;
  }

  async adjustQuantity(id: number, dto: AdjustQuantityDto) {
    return this.prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.findUnique({ where: { id } });
      if (!ingredient)
        throw new NotFoundException(`Ingrediente #${id} no encontrado`);

      const newQuantity = ingredient.quantity + dto.amount;
      if (newQuantity < 0) {
        throw new BadRequestException('La cantidad no puede ser negativa');
      }

      const updated = await tx.ingredient.update({
        where: { id },
        data: { quantity: newQuantity },
      });

      this.emitLowStockIfNeeded(updated);
      return updated;
    });
  }

  private emitLowStockIfNeeded(ingredient: {
    id: number;
    name: string;
    quantity: number;
    minStock: number;
  }) {
    if (ingredient.minStock > 0 && ingredient.quantity <= ingredient.minStock) {
      this.alertsGateway.emitStockAlert({
        entityType: 'ingrediente',
        entityName: ingredient.name,
        currentStock: ingredient.quantity,
        minStock: ingredient.minStock,
      });
    }
  }

  private mapObservations<T extends { notes?: string; observations?: string }>(
    dto: T,
  ) {
    const { observations, ...rest } = dto;
    if (observations !== undefined && rest.notes === undefined) {
      return { ...rest, notes: observations };
    }
    return rest;
  }

  private formatIngredientResponse(
    ingredient: Prisma.IngredientGetPayload<object>,
  ) {
    return {
      ...ingredient,
      observations: ingredient.notes ?? undefined,
    };
  }

  private buildPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ) {
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
