import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        ...(filters.search && {
          name: { contains: filters.search, mode: 'insensitive' },
        }),
        ...(filters.unit && { unit: { equals: filters.unit, mode: 'insensitive' } }),
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (filters.belowMinStock) {
      return ingredients.filter((item) => item.quantity <= item.minStock);
    }

    return ingredients;
  }

  async findOne(id: number) {
    const ingredient = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) throw new NotFoundException(`Ingrediente #${id} no encontrado`);
    return ingredient;
  }

  create(dto: CreateIngredientDto) {
    const data = this.mapObservations(dto);
    return this.prisma.ingredient.create({ data });
  }

  async update(id: number, dto: UpdateIngredientDto) {
    await this.findOne(id);
    const data = this.mapObservations(dto);
    const ingredient = await this.prisma.ingredient.update({ where: { id }, data });
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
      if (!ingredient) throw new NotFoundException(`Ingrediente #${id} no encontrado`);

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

  private emitLowStockIfNeeded(ingredient: { id: number; name: string; quantity: number; minStock: number }) {
    if (ingredient.minStock > 0 && ingredient.quantity <= ingredient.minStock) {
      this.alertsGateway.emitStockAlert({
        entityType: 'ingrediente',
        entityName: ingredient.name,
        currentStock: ingredient.quantity,
        minStock: ingredient.minStock,
      });
    }
  }

  private mapObservations<
    T extends { notes?: string; observations?: string }
  >(dto: T) {
    const { observations, ...rest } = dto;
    if (observations !== undefined && rest.notes === undefined) {
      return { ...rest, notes: observations };
    }
    return rest;
  }
}
