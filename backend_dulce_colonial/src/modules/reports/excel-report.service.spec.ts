import * as ExcelJS from 'exceljs';
import { ExcelReportService } from './excel-report.service';

describe('ExcelReportService', () => {
  const openedAt = new Date('2026-04-27T08:00:00.000Z');
  const closedAt = new Date('2026-04-27T18:00:00.000Z');

  const createPrismaMock = () => ({
    cashRegister: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        status: 'CERRADA',
        openedAt,
        closedAt,
        openingBalance: 100000,
        closingBalance: 180000,
        expectedBalance: 180000,
        notes: 'Cierre normal',
        openedBy: { name: 'Admin' },
        closedBy: { name: 'Operador' },
      }),
    },
    cashTransaction: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          type: 'VENTA',
          amount: 80000,
          description: 'Venta mostrador',
          reference: 'FAC-0001',
          productQty: 2,
          productPrice: 40000,
          balanceAfter: 180000,
          createdAt: new Date('2026-04-27T10:00:00.000Z'),
          user: { id: 1, name: 'Operador' },
          product: { id: 1, name: 'Torta colonial', category: 'Tortas' },
        },
      ]),
    },
    invoice: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          number: 'FAC-0001',
          subtotal: 80000,
          total: 80000,
          status: 'EMITIDA',
          createdAt: new Date('2026-04-27T10:00:00.000Z'),
          user: { id: 1, name: 'Operador' },
          items: [
            {
              id: 1,
              description: 'Torta colonial',
              quantity: 2,
              unitPrice: 40000,
              total: 80000,
              product: { id: 1, name: 'Torta colonial' },
            },
          ],
        },
      ]),
    },
    movement: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          type: 'SALIDA',
          referenceType: 'VENTA',
          quantity: 2,
          delta: -2,
          notes: 'Venta mostrador',
          createdAt: new Date('2026-04-27T10:00:00.000Z'),
          user: { id: 1, name: 'Operador' },
          product: { id: 1, name: 'Torta colonial' },
          ingredient: null,
        },
      ]),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Torta colonial',
          category: 'Tortas',
          price: 40000,
          stock: 1,
          minStock: 2,
          status: 'ACTIVO',
        },
      ]),
    },
    ingredient: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Harina',
          unit: 'kg',
          quantity: 1,
          minStock: 2,
        },
      ]),
    },
    activityLog: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          action: 'CREATE',
          entity: 'cash',
          details: { description: 'Venta registrada' },
          createdAt: new Date('2026-04-27T10:00:00.000Z'),
          user: { name: 'Operador' },
        },
      ]),
    },
  });

  it('genera un reporte diario legible con hojas separadas', async () => {
    const service = new ExcelReportService(createPrismaMock() as any);
    const buffer = await service.generateDailyReport(1);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Resumen Diario',
      'Caja',
      'Ventas',
      'Facturas',
      'Movimientos Inventario',
      'Bajo Stock',
      'Actividad',
    ]);

    expect(workbook.getWorksheet('Resumen Diario')?.getCell('A1').value).toBe(
      'Dulce Colonial',
    );
    expect(workbook.getWorksheet('Ventas')?.getCell('D7').numFmt).toContain(
      'COP',
    );

    const forbidden = ['undefined', 'null', 'NaN', '[object Object]'];
    const values: string[] = [];
    workbook.eachSheet((sheet) => {
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          values.push(String(cell.value));
        });
      });
    });

    forbidden.forEach((text) => {
      expect(values.join(' ')).not.toContain(text);
    });
  });
});
