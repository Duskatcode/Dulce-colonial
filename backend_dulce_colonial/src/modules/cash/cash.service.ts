import {
  Injectable, Logger,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AlertsGateway } from '../alerts/alerts.gateway';
import { OpenRegisterDto } from './dto/open-register.dto';
import { CloseRegisterDto } from './dto/close-register.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';

// Tipos que restan de la caja
const DEBIT_TYPES  = ['GASTO', 'DEVOLUCION', 'COTIZACION'];
// Tipos que suman a la caja
const CREDIT_TYPES = ['VENTA', 'INGRESO'];

@Injectable()
export class CashService {
  private readonly logger = new Logger(CashService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  // ─── Estado actual de la caja ─────────────────────────────────────────────
  async getStatus() {
    const register = await this.prisma.cashRegister.findFirst({
      where: { status: 'ABIERTA' },
      include: {
        openedBy: { select: { id: true, name: true } },
        _count:   { select: { transactions: true } },
      },
    });

    if (!register) {
      return { status: 'CERRADA', balance: 0, register: null };
    }

    const balance = await this.getCurrentBalance(register.id);
    return { status: 'ABIERTA', balance, register };
  }

  // ─── Abrir caja ───────────────────────────────────────────────────────────
  async openRegister(dto: OpenRegisterDto, userId: number) {
    const existing = await this.prisma.cashRegister.findFirst({
      where: { status: 'ABIERTA' },
    });

    if (existing) {
      throw new BadRequestException('Ya hay una caja abierta. Ciérrala antes de abrir una nueva.');
    }

    const register = await this.prisma.cashRegister.create({
      data: {
        status:         'ABIERTA',
        openedAt:       new Date(),
        openingBalance: dto.openingBalance,
        notes:          dto.notes,
        openedById:     userId,
      },
      include: {
        openedBy: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`💰 Caja abierta por usuario #${userId} con $${dto.openingBalance.toLocaleString('es-CO')} COP`);

    // Notificar via WebSocket
    this.alertsGateway.emitNotification('cash_opened', {
      registerId:     register.id,
      openingBalance: dto.openingBalance,
      openedBy:       register.openedBy?.name,
    });

    return register;
  }

  // ─── Cerrar caja ──────────────────────────────────────────────────────────
  async closeRegister(dto: CloseRegisterDto, userId: number) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { status: 'ABIERTA' },
    });

    if (!register) {
      throw new BadRequestException('No hay una caja abierta.');
    }

    const expectedBalance = await this.getCurrentBalance(register.id);
    const difference      = dto.closingBalance - expectedBalance;

    const closed = await this.prisma.cashRegister.update({
      where: { id: register.id },
      data: {
        status:          'CERRADA',
        closedAt:        new Date(),
        closingBalance:  dto.closingBalance,
        expectedBalance: expectedBalance,
        closedById:      userId,
        notes:           dto.notes,
      },
      include: {
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
      },
    });

    this.logger.log(`🔒 Caja cerrada por usuario #${userId}. Esperado: $${expectedBalance} | Físico: $${dto.closingBalance} | Diferencia: $${difference}`);

    this.alertsGateway.emitNotification('cash_closed', {
      registerId:      register.id,
      expectedBalance,
      closingBalance:  dto.closingBalance,
      difference,
      closedBy:        closed.closedBy?.name,
    });

    return {
      ...closed,
      expectedBalance,
      difference,
      differenceLabel: difference === 0
        ? 'Cuadre exacto ✅'
        : difference > 0
          ? `Sobrante: $${difference.toLocaleString('es-CO')} COP`
          : `Faltante: $${Math.abs(difference).toLocaleString('es-CO')} COP`,
    };
  }

  // ─── Registrar transacción ────────────────────────────────────────────────
  async createTransaction(dto: CreateTransactionDto, userId: number) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { status: 'ABIERTA' },
    });

    if (!register) {
      throw new BadRequestException('No hay una caja abierta. Abre la caja antes de registrar movimientos.');
    }

    const currentBalance = await this.getCurrentBalance(register.id);
    const isDebit        = DEBIT_TYPES.includes(dto.type);
    const isCredit       = CREDIT_TYPES.includes(dto.type);

    // Calcular monto final según tipo de transacción
    let amount = dto.amount;

    // Si es venta con producto, calcular monto por precio × cantidad
    if (dto.type === 'VENTA' && dto.productId && dto.productQty) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
      });
      if (!product) throw new NotFoundException(`Producto #${dto.productId} no encontrado`);
      if (product.stock < dto.productQty) {
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${product.stock}, solicitado: ${dto.productQty}`,
        );
      }
      amount = Number(product.price) * dto.productQty;
    }

    // Calcular nuevo balance
    const balanceAfter = isDebit
      ? currentBalance - amount
      : currentBalance + amount;

    // Advertencia si queda en negativo (no bloquea)
    if (balanceAfter < 0) {
      this.logger.warn(`⚠️  Caja en negativo después de transacción: $${balanceAfter.toLocaleString('es-CO')} COP`);
      this.alertsGateway.emitNotification('cash_negative', {
        balance:     balanceAfter,
        transaction: dto.description,
      });
    }

    // Transacción atómica: registrar movimiento + descontar stock si aplica
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Descontar stock si es venta de producto
      if (dto.type === 'VENTA' && dto.productId && dto.productQty) {
        const product = await tx.product.findUnique({ where: { id: dto.productId } });
        const newStock = product.stock - dto.productQty;
        await tx.product.update({
          where: { id: dto.productId },
          data: {
            stock:  newStock,
            status: newStock === 0 ? 'AGOTADO' : 'ACTIVO',
          },
        });

        // Registrar movimiento de inventario
        await tx.movement.create({
          data: {
            type:          'SALIDA',
            referenceType: 'PRODUCTO',
            quantity:      dto.productQty,
            reason:        `Venta — ${dto.description}`,
            userId,
            productId:     dto.productId,
          },
        });
      }

      // Crear la transacción de caja
      return tx.cashTransaction.create({
        data: {
          cashRegisterId: register.id,
          type:           dto.type,
          amount,
          description:    dto.description,
          reference:      dto.reference,
          userId,
          productId:      dto.productId   ?? undefined,
          productQty:     dto.productQty  ?? undefined,
          productPrice:   dto.productId
            ? (await tx.product.findUnique({ where: { id: dto.productId } }))?.price
            : undefined,
          balanceAfter,
        },
        include: {
          user:    { select: { id: true, name: true } },
          product: { select: { id: true, name: true, price: true } },
        },
      });
    });

    this.logger.log(
      `💳 ${dto.type} — $${amount.toLocaleString('es-CO')} COP — "${dto.description}" — usuario #${userId} — saldo: $${balanceAfter.toLocaleString('es-CO')}`,
    );

    return { ...transaction, balanceAfter };
  }

  // ─── Listar transacciones ─────────────────────────────────────────────────
  async findTransactions(filters: FilterTransactionsDto) {
    const { type, dateFrom, dateTo, userId, cashRegisterId, page = 1, limit = 30 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type)           where.type           = type;
    if (userId)         where.userId         = userId;
    if (cashRegisterId) where.cashRegisterId = cashRegisterId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(dateTo);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.cashTransaction.findMany({
        where,
        skip,
        take:     limit,
        orderBy:  { createdAt: 'desc' },
        include: {
          user:    { select: { id: true, name: true } },
          product: { select: { id: true, name: true } },
        },
      }),
      this.prisma.cashTransaction.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Historial de cajas ───────────────────────────────────────────────────
  async findRegisters(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.cashRegister.findMany({
        skip,
        take:    limit,
        orderBy: { openedAt: 'desc' },
        include: {
          openedBy: { select: { name: true } },
          closedBy: { select: { name: true } },
          _count:   { select: { transactions: true } },
        },
      }),
      this.prisma.cashRegister.count(),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Resumen de caja actual ───────────────────────────────────────────────
  async getSummary(cashRegisterId?: number) {
    const registerId = cashRegisterId ?? (
      await this.prisma.cashRegister.findFirst({ where: { status: 'ABIERTA' } })
    )?.id;

    if (!registerId) throw new NotFoundException('No hay caja abierta');

    const register = await this.prisma.cashRegister.findUnique({
      where: { id: registerId },
      include: {
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
      },
    });

    const transactions = await this.prisma.cashTransaction.findMany({
      where: { cashRegisterId: registerId },
      include: { user: { select: { id: true, name: true } } },
    });

    // Totales por tipo
    const totals = transactions.reduce((acc, t) => {
      const amount = Number(t.amount);
      acc[t.type] = (acc[t.type] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    // Por usuario
    const byUser = transactions.reduce((acc, t) => {
      const name   = t.user.name;
      const amount = Number(t.amount);
      if (!acc[name]) acc[name] = { name, count: 0, total: 0 };
      acc[name].count++;
      acc[name].total += CREDIT_TYPES.includes(t.type) ? amount : -amount;
      return acc;
    }, {} as Record<string, any>);

    const currentBalance = await this.getCurrentBalance(registerId);

    return {
      register,
      currentBalance,
      totals,
      byUser:        Object.values(byUser),
      totalIncome:   (totals['VENTA'] || 0) + (totals['INGRESO'] || 0),
      totalExpense:  (totals['GASTO'] || 0) + (totals['COTIZACION'] || 0),
      totalReturns:  totals['DEVOLUCION'] || 0,
      transactionCount: transactions.length,
    };
  }

  // ─── Helper: balance actual ───────────────────────────────────────────────
  private async getCurrentBalance(cashRegisterId: number): Promise<number> {
    const register = await this.prisma.cashRegister.findUnique({
      where: { id: cashRegisterId },
    });
    if (!register) return 0;

    const lastTransaction = await this.prisma.cashTransaction.findFirst({
      where:   { cashRegisterId },
      orderBy: { createdAt: 'desc' },
    });

    return lastTransaction
      ? Number(lastTransaction.balanceAfter)
      : Number(register.openingBalance);
  }
}
