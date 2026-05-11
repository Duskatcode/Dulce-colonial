import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AlertsGateway } from '../alerts/alerts.gateway';
import { OpenRegisterDto } from './dto/open-register.dto';
import { CloseRegisterDto } from './dto/close-register.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';
import { ExcelReportService } from '../reports/excel-report.service';
import { DriveService } from '../drive/drive.service';

// Tipos que restan de la caja
const DEBIT_TYPES = ['GASTO', 'DEVOLUCION', 'COTIZACION'];
// Tipos que suman a la caja
const CREDIT_TYPES = ['VENTA', 'INGRESO'];

type ReportUploadResult = {
  success: boolean;
  destination?: string;
  fileName?: string;
  driveId?: string;
  driveUrl?: string;
  error?: string;
};

const invoiceInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
    },
  },
  cashRegister: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class CashService {
  private readonly logger = new Logger(CashService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsGateway: AlertsGateway,
    private readonly excelReportService: ExcelReportService,
    private readonly driveService: DriveService,
  ) {}

  // ─── Estado actual de la caja ─────────────────────────────────────────────
  async getStatus() {
    const register = await this.prisma.cashRegister.findFirst({
      where: { status: 'ABIERTA' },
      include: {
        openedBy: { select: { id: true, name: true } },
        _count: { select: { transactions: true } },
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
      throw new BadRequestException(
        'Ya hay una caja abierta. Ciérrala antes de abrir una nueva.',
      );
    }

    const register = await this.prisma.cashRegister.create({
      data: {
        status: 'ABIERTA',
        openedAt: new Date(),
        openingBalance: dto.openingBalance,
        notes: dto.notes,
        openedById: userId,
      },
      include: {
        openedBy: { select: { id: true, name: true } },
      },
    });

    this.logger.log(
      `💰 Caja abierta por usuario #${userId} con $${dto.openingBalance.toLocaleString('es-CO')} COP`,
    );

    // Notificar via WebSocket
    this.alertsGateway.emitNotification('cash_opened', {
      registerId: register.id,
      openingBalance: dto.openingBalance,
      openedBy: register.openedBy?.name,
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
    const difference = dto.closingBalance - expectedBalance;

    const closed = await this.prisma.cashRegister.update({
      where: { id: register.id },
      data: {
        status: 'CERRADA',
        closedAt: new Date(),
        closingBalance: dto.closingBalance,
        expectedBalance: expectedBalance,
        closedById: userId,
        notes: dto.notes,
      },
      include: {
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
      },
    });

    this.logger.log(
      `🔒 Caja cerrada por usuario #${userId}. Esperado: $${expectedBalance} | Físico: $${dto.closingBalance} | Diferencia: $${difference}`,
    );

    this.alertsGateway.emitNotification('cash_closed', {
      registerId: register.id,
      expectedBalance,
      closingBalance: dto.closingBalance,
      difference,
      closedBy: closed.closedBy?.name,
    });
    const reportUpload = await this.generateAndUploadExcelReport(register.id);

    return {
      ...closed,
      expectedBalance,
      difference,
      reportUpload,
      differenceLabel:
        difference === 0
          ? 'Cuadre exacto ✅'
          : difference > 0
            ? `Sobrante: $${difference.toLocaleString('es-CO')} COP`
            : `Faltante: $${Math.abs(difference).toLocaleString('es-CO')} COP`,
    };
  }

  // ─── Registrar transacción ────────────────────────────────────────────────
  async createTransaction(dto: CreateTransactionDto, userId: number) {
    const result = await this.prisma.$transaction(async (tx) => {
      const register = await tx.cashRegister.findFirst({
        where: { status: 'ABIERTA' },
      });

      if (!register) {
        throw new BadRequestException(
          'No hay una caja abierta. Abre la caja antes de registrar movimientos.',
        );
      }

      const lastTransaction = await tx.cashTransaction.findFirst({
        where: { cashRegisterId: register.id },
        orderBy: { createdAt: 'desc' },
      });
      const currentBalance = lastTransaction
        ? Number(lastTransaction.balanceAfter)
        : Number(register.openingBalance);
      const isDebit = DEBIT_TYPES.includes(dto.type);
      let amount = dto.amount;
      let productPrice: Prisma.Decimal | undefined;
      let invoice:
        | Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>
        | undefined;

      if (dto.type === 'VENTA' && dto.productId && dto.productQty) {
        const product = await tx.product.findUnique({
          where: { id: dto.productId },
        });
        if (!product)
          throw new NotFoundException(
            `Producto #${dto.productId} no encontrado`,
          );
        if (!product.price) {
          throw new BadRequestException(
            `El producto "${product.name}" no tiene un precio configurado.`,
          );
        }
        if (product.stock < dto.productQty) {
          throw new BadRequestException(
            `Stock insuficiente. Disponible: ${product.stock}, solicitado: ${dto.productQty}`,
          );
        }

        productPrice = product.price;
        amount = Number(product.price) * dto.productQty;

        const newStock = product.stock - dto.productQty;
        await tx.product.update({
          where: { id: dto.productId },
          data: {
            stock: newStock,
            status: newStock === 0 ? 'AGOTADO' : 'ACTIVO',
          },
        });

        await tx.movement.create({
          data: {
            type: 'SALIDA',
            entityType: 'PRODUCTO',
            referenceType: 'VENTA',
            quantity: dto.productQty,
            delta: -dto.productQty,
            notes: `Venta — ${dto.description}`,
            userId,
            productId: dto.productId,
          },
        });

        if (dto.generateInvoice) {
          const invoiceNumber = await this.generateInvoiceNumber(tx);
          invoice = await tx.invoice.create({
            data: {
              number: invoiceNumber,
              cashRegisterId: register.id,
              userId,
              subtotal: new Prisma.Decimal(amount),
              total: new Prisma.Decimal(amount),
              items: {
                create: [
                  {
                    productId: product.id,
                    description: product.name,
                    quantity: dto.productQty,
                    unitPrice: product.price,
                    total: new Prisma.Decimal(amount),
                  },
                ],
              },
            },
            include: invoiceInclude,
          });
        }
      }

      if (dto.generateInvoice && dto.type !== 'VENTA') {
        throw new BadRequestException(
          'Solo las ventas de producto pueden generar factura automática.',
        );
      }

      if (dto.generateInvoice && (!dto.productId || !dto.productQty)) {
        throw new BadRequestException(
          'Selecciona un producto para generar factura.',
        );
      }

      const balanceAfter = isDebit
        ? currentBalance - amount
        : currentBalance + amount;

      const transaction = await tx.cashTransaction.create({
        data: {
          cashRegisterId: register.id,
          type: dto.type,
          amount,
          description: dto.description,
          reference: invoice?.number ?? dto.reference,
          userId,
          productId: dto.productId ?? undefined,
          productQty: dto.productQty ?? undefined,
          productPrice,
          balanceAfter,
        },
        include: {
          user: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, price: true } },
        },
      });

      return {
        transaction,
        invoice: invoice ? this.formatInvoiceResponse(invoice) : undefined,
        balanceAfter,
      };
    });

    if (result.balanceAfter < 0) {
      this.logger.warn(
        `⚠️  Caja en negativo después de transacción: $${result.balanceAfter.toLocaleString('es-CO')} COP`,
      );
      this.alertsGateway.emitNotification('cash_negative', {
        balance: result.balanceAfter,
        transaction: dto.description,
      });
    }

    this.logger.log(
      `💳 ${dto.type} — $${Number(result.transaction.amount).toLocaleString('es-CO')} COP — "${dto.description}" — usuario #${userId} — saldo: $${result.balanceAfter.toLocaleString('es-CO')}`,
    );

    if (!result.invoice) {
      return { ...result.transaction, balanceAfter: result.balanceAfter };
    }

    return {
      transaction: {
        ...result.transaction,
        balanceAfter: result.balanceAfter,
      },
      invoice: result.invoice,
    };
  }

  // ─── Listar transacciones ─────────────────────────────────────────────────
  async findTransactions(filters: FilterTransactionsDto) {
    const { type, dateFrom, dateTo, userId, cashRegisterId } = filters;
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 20);
    const skip = Number((page - 1) * limit);

    const where: Prisma.CashTransactionWhereInput = {};
    if (type) where.type = type;
    if (userId) where.userId = userId;
    if (cashRegisterId) where.cashRegisterId = cashRegisterId;
    if (dateFrom || dateTo) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (dateFrom) createdAtFilter.gte = new Date(dateFrom);
      if (dateTo) createdAtFilter.lte = new Date(dateTo);
      where.createdAt = createdAtFilter;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.cashTransaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
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
        take: limit,
        orderBy: { openedAt: 'desc' },
        include: {
          openedBy: { select: { name: true } },
          closedBy: { select: { name: true } },
          _count: { select: { transactions: true } },
        },
      }),
      this.prisma.cashRegister.count(),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Resumen de caja actual ───────────────────────────────────────────────
  async getSummary(cashRegisterId?: number) {
    const registerId =
      cashRegisterId ??
      (
        await this.prisma.cashRegister.findFirst({
          where: { status: 'ABIERTA' },
        })
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
    const totals = transactions.reduce<Record<string, number>>((acc, t) => {
      const amount = Number(t.amount);
      acc[t.type] = (acc[t.type] || 0) + amount;
      return acc;
    }, {});

    // Por usuario
    const byUser = transactions.reduce<
      Record<string, { name: string; count: number; total: number }>
    >((acc, t) => {
      const name = t.user?.name ?? 'Sin usuario';
      const amount = Number(t.amount);
      if (!acc[name]) acc[name] = { name, count: 0, total: 0 };
      acc[name].count += 1;
      acc[name].total += CREDIT_TYPES.includes(t.type) ? amount : -amount;
      return acc;
    }, {});

    const currentBalance = await this.getCurrentBalance(registerId);

    return {
      register,
      currentBalance,
      totals,
      byUser: Object.values(byUser),
      totalIncome: (totals['VENTA'] || 0) + (totals['INGRESO'] || 0),
      totalExpense: (totals['GASTO'] || 0) + (totals['COTIZACION'] || 0),
      totalReturns: totals['DEVOLUCION'] || 0,
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
      where: { cashRegisterId },
      orderBy: { createdAt: 'desc' },
    });

    return lastTransaction
      ? Number(lastTransaction.balanceAfter)
      : Number(register.openingBalance);
  }

  private async generateInvoiceNumber(tx: Prisma.TransactionClient) {
    const lastInvoice = await tx.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { number: true },
    });

    if (!lastInvoice?.number) return 'FAC-0001';

    const numericPart = lastInvoice.number.replace('FAC-', '');
    const current = Number.parseInt(numericPart, 10);
    const next = Number.isNaN(current) ? 1 : current + 1;
    return `FAC-${String(next).padStart(4, '0')}`;
  }

  private formatInvoiceResponse(
    invoice: Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>,
  ) {
    return {
      id: invoice.id,
      number: invoice.number,
      cashRegisterId: invoice.cashRegisterId,
      userId: invoice.userId,
      userName: invoice.user?.name ?? undefined,
      subtotal: Number(invoice.subtotal),
      total: Number(invoice.total),
      status: invoice.status,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      items: invoice.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name ?? item.description,
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.total),
        total: Number(item.total),
      })),
    };
  }

  private async generateAndUploadExcelReport(
    cashRegisterId: number,
  ): Promise<ReportUploadResult> {
    console.log('[CashClose] Generating Excel report...');
    const fileName = `reporte-diario-dulce-colonial-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

    try {
      const buffer =
        await this.excelReportService.generateDailyReport(cashRegisterId);

      if (!buffer?.length) {
        console.log('[CashClose] Excel generated, size: 0');
        return {
          success: false,
          fileName,
          error: 'El reporte Excel se generó vacío.',
        };
      }

      console.log('[CashClose] Excel generated, size:', buffer.length);

      const upload = await this.driveService.uploadBufferToFolder(
        fileName,
        buffer,
        'reportes-diarios',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      console.log('[CashClose] Drive upload success:', fileName);
      return {
        success: true,
        destination: 'Dulce Colonial/reportes-diarios',
        fileName,
        driveId: upload.id,
        driveUrl: upload.webViewLink,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Excel/Drive failed after cash close: ${message}`);
      return {
        success: false,
        destination: 'Dulce Colonial/reportes-diarios',
        fileName,
        error: this.toPublicReportError(message),
      };
    }
  }

  private toPublicReportError(message: string) {
    if (
      message.includes('no está configurado') ||
      message.includes('autorizado') ||
      message.includes('invalid_grant') ||
      message.includes('revoked')
    ) {
      return 'Google Drive no está autorizado. Revisa la conexión de Drive.';
    }

    if (message.includes('Carpeta')) {
      return 'No se pudo encontrar o crear la carpeta de reportes en Google Drive.';
    }

    return 'El reporte no pudo subirse a Google Drive. Revisa la configuración de Drive.';
  }
}
