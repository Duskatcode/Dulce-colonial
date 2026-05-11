import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CashService } from './cash.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

describe('CashService', () => {
  const register = {
    id: 10,
    status: 'ABIERTA',
    openingBalance: new Prisma.Decimal(100000),
  };
  const product = {
    id: 5,
    name: 'Torta',
    price: new Prisma.Decimal(12000),
    stock: 4,
    minStock: 1,
  };
  const userId = 1;

  let prisma: any;
  let tx: any;
  let service: CashService;

  const baseSaleDto = (
    overrides: Partial<CreateTransactionDto> = {},
  ): CreateTransactionDto => ({
    type: 'VENTA',
    amount: 12000,
    description: 'Venta de torta',
    productId: product.id,
    productQty: 2,
    ...overrides,
  });

  beforeEach(() => {
    tx = {
      cashRegister: {
        findFirst: jest.fn().mockResolvedValue(register),
        update: jest.fn(),
      },
      cashTransaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 99,
            ...data,
            user: { id: userId, name: 'Admin' },
            product: { id: product.id, name: product.name, price: product.price },
          }),
        ),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue(product),
        update: jest.fn().mockResolvedValue({ ...product, stock: 2 }),
      },
      movement: {
        create: jest.fn().mockResolvedValue({ id: 77 }),
      },
      invoice: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 88,
          number: 'FAC-0001',
          cashRegisterId: register.id,
          userId,
          subtotal: new Prisma.Decimal(24000),
          total: new Prisma.Decimal(24000),
          status: 'EMITIDA',
          createdAt: new Date('2026-04-27T10:00:00.000Z'),
          updatedAt: new Date('2026-04-27T10:00:00.000Z'),
          items: [
            {
              id: 1,
              productId: product.id,
              description: product.name,
              quantity: 2,
              unitPrice: product.price,
              total: new Prisma.Decimal(24000),
              product: {
                id: product.id,
                name: product.name,
                price: product.price,
              },
            },
          ],
          cashRegister: register,
          user: { id: userId, name: 'Admin', email: 'admin@test.com' },
        }),
      },
    };

    prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
      cashRegister: {
        findFirst: jest.fn().mockResolvedValue(register),
        findUnique: jest.fn().mockResolvedValue(register),
        update: jest.fn().mockResolvedValue({
          ...register,
          status: 'CERRADA',
          closingBalance: new Prisma.Decimal(124000),
        }),
      },
      cashTransaction: {
        findFirst: jest.fn().mockResolvedValue({
          balanceAfter: new Prisma.Decimal(124000),
        }),
      },
    };

    service = new CashService(
      prisma,
      { emitNotification: jest.fn(), emitStockAlert: jest.fn() } as any,
      { generateDailyReport: jest.fn().mockResolvedValue(Buffer.from('xlsx')) } as any,
      {
        uploadBufferToFolder: jest.fn().mockResolvedValue({
          id: 'drive-id',
          webViewLink: 'https://drive.test/file',
          folderKey: 'reportes-diarios',
        }),
      } as any,
    );
  });

  it('no permite vender si no hay caja abierta', async () => {
    tx.cashRegister.findFirst.mockResolvedValue(null);

    await expect(
      service.createTransaction(baseSaleDto(), userId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.cashTransaction.create).not.toHaveBeenCalled();
  });

  it('descuenta stock, registra movimiento y transacción de caja', async () => {
    const result = await service.createTransaction(baseSaleDto(), userId);

    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { stock: 2, status: 'ACTIVO' },
    });
    expect(tx.movement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'SALIDA',
        entityType: 'PRODUCTO',
        referenceType: 'VENTA',
        quantity: 2,
        delta: -2,
        productId: product.id,
        userId,
      }),
    });
    expect(tx.cashTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'VENTA',
          amount: 24000,
          cashRegisterId: register.id,
          balanceAfter: 124000,
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ balanceAfter: 124000 }));
  });

  it('rechaza venta sin stock suficiente y no deja registros parciales', async () => {
    tx.product.findUnique.mockResolvedValue({ ...product, stock: 1 });

    await expect(
      service.createTransaction(baseSaleDto(), userId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.movement.create).not.toHaveBeenCalled();
    expect(tx.cashTransaction.create).not.toHaveBeenCalled();
  });

  it('genera factura en la misma operación cuando se solicita', async () => {
    const result = await service.createTransaction(
      baseSaleDto({ generateInvoice: true }),
      userId,
    );

    expect(tx.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          number: 'FAC-0001',
          cashRegisterId: register.id,
          subtotal: new Prisma.Decimal(24000),
          total: new Prisma.Decimal(24000),
        }),
      }),
    );
    expect(tx.cashTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reference: 'FAC-0001' }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        invoice: expect.objectContaining({
          number: 'FAC-0001',
          total: 24000,
          items: [
            expect.objectContaining({
              productName: product.name,
              quantity: 2,
              subtotal: 24000,
            }),
          ],
        }),
      }),
    );
  });

  it('cierre de caja calcula saldo esperado y diferencia', async () => {
    const result = await service.closeRegister(
      { closingBalance: 125000, notes: 'Cierre turno' },
      userId,
    );

    expect(prisma.cashRegister.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CERRADA',
          closingBalance: 125000,
          expectedBalance: 124000,
          closedById: userId,
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        expectedBalance: 124000,
        difference: 1000,
        reportUpload: expect.objectContaining({
          success: true,
          destination: 'Dulce Colonial/reportes-diarios',
        }),
      }),
    );
  });
});
