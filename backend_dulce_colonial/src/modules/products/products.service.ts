import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AlertsGateway } from '../alerts/alerts.gateway';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  async findAll(filters: FilterProductsDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const where: Prisma.ProductWhereInput = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { category: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.category) where.category = { equals: filters.category, mode: 'insensitive' };
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Producto #${id} no encontrado`);
    return product;
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        category: dto.category,
        description: dto.description,
        price: dto.price,
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
        status: dto.status ?? ProductStatus.ACTIVO,
      },
    });
    this.emitLowStockIfNeeded(product);
    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: dto,
    });
    this.emitLowStockIfNeeded(product);
    return product;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { message: `Producto #${id} eliminado` };
  }

  async getCategories() {
    const rows = await this.prisma.product.findMany({
      where: { category: { not: null } },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    return rows.map((row) => row.category).filter(Boolean);
  }

  async getLowStock() {
    const all = await this.prisma.product.findMany({ orderBy: { stock: 'asc' } });
    return all.filter((product) => {
      const threshold = product.minStock && product.minStock > 0 ? product.minStock : 2;
      return product.stock <= threshold;
    });
  }

  async adjustStock(id: number, dto: AdjustStockDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new NotFoundException(`Producto #${id} no encontrado`);

      const newStock = product.stock + dto.amount;
      if (newStock < 0) throw new BadRequestException('El stock no puede ser negativo');

      const updated = await tx.product.update({
        where: { id },
        data: { stock: newStock },
      });

      this.emitLowStockIfNeeded(updated);
      return updated;
    });
  }

  private emitLowStockIfNeeded(product: { id: number; name: string; stock: number; minStock: number }) {
    const threshold = product.minStock && product.minStock > 0 ? product.minStock : 2;
    if (product.stock <= threshold) {
      this.alertsGateway.emitStockAlert({
        entityType: 'producto',
        entityName: product.name,
        currentStock: product.stock,
        minStock: threshold,
      });
    }
  }
}
