import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../config/prisma/prisma.service';

type CashRegisterWithUsers = Prisma.CashRegisterGetPayload<{
  include: {
    openedBy: { select: { name: true } };
    closedBy: { select: { name: true } };
  };
}>;

type TransactionWithRelations = Prisma.CashTransactionGetPayload<{
  include: {
    user: { select: { id: true; name: true } };
    product: { select: { id: true; name: true; category: true } };
  };
}>;

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    items: {
      include: {
        product: { select: { id: true; name: true } };
      };
    };
    user: { select: { id: true; name: true } };
  };
}>;

type MovementWithRelations = Prisma.MovementGetPayload<{
  include: {
    user: { select: { id: true; name: true } };
    product: { select: { id: true; name: true } };
    ingredient: { select: { id: true; name: true; unit: true } };
  };
}>;

type ActivityWithUser = Prisma.ActivityLogGetPayload<{
  include: {
    user: { select: { name: true } };
  };
}>;

type LowStockProduct = Prisma.ProductGetPayload<object>;
type LowStockIngredient = Prisma.IngredientGetPayload<object>;

type ReportData = {
  register: CashRegisterWithUsers;
  periodStart: Date;
  periodEnd: Date;
  transactions: TransactionWithRelations[];
  sales: TransactionWithRelations[];
  invoices: InvoiceWithRelations[];
  movements: MovementWithRelations[];
  lowProducts: LowStockProduct[];
  lowIngredients: LowStockIngredient[];
  activity: ActivityWithUser[];
  totals: {
    totalVentas: number;
    totalIngresosCaja: number;
    totalEgresosCaja: number;
    totalFacturado: number;
    productosVendidos: number;
    saldoInicial: number;
    saldoEsperado: number;
    dineroContado: number | null;
    diferencia: number | null;
    promedioVenta: number;
  };
};

@Injectable()
export class ExcelReportService {
  private readonly headerColor = 'FF7A3E12';
  private readonly titleColor = 'FF1F2937';
  private readonly subtitleColor = 'FF6B4F3B';
  private readonly lightFill = 'FFFFF7ED';
  private readonly zebraAltColor = 'FFFFFBEB';
  private readonly borderColor = 'FFE7D8C9';
  private readonly dateFormat = 'dd/mm/yyyy hh:mm';
  private readonly currencyFormat = '"$"#,##0 "COP";-"$"#,##0 "COP"';

  constructor(private readonly prisma: PrismaService) {}

  async generateDailyReport(cashRegisterId: number): Promise<Buffer> {
    const data = await this.getReportData(cashRegisterId);
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    workbook.creator = 'Dulce Colonial';
    workbook.subject = 'Reporte diario de operaciones';
    workbook.title = 'Reporte diario de operaciones';

    this.buildDailySummarySheet(workbook, data);
    this.buildCashSheet(workbook, data);
    this.buildSalesSheet(workbook, data);
    this.buildInvoicesSheet(workbook, data);
    this.buildMovementsSheet(workbook, data);
    this.buildLowStockSheet(workbook, data);
    this.buildActivitySheet(workbook, data);

    workbook.eachSheet((sheet) => {
      sheet.properties.defaultRowHeight = 20;
      this.autoFitColumns(sheet);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async getReportData(cashRegisterId: number): Promise<ReportData> {
    const register = await this.prisma.cashRegister.findUnique({
      where: { id: cashRegisterId },
      include: {
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } },
      },
    });

    if (!register) {
      throw new NotFoundException('Caja no encontrada');
    }

    const periodStart = register.openedAt ?? new Date();
    const periodEnd = register.closedAt ?? new Date();

    const [
      transactions,
      invoices,
      movements,
      products,
      ingredients,
      activity,
    ] = await Promise.all([
      this.prisma.cashTransaction.findMany({
        where: { cashRegisterId },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, category: true } },
        },
      }),
      this.prisma.invoice.findMany({
        where: { cashRegisterId },
        orderBy: { createdAt: 'asc' },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.movement.findMany({
        where: {
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true } },
          product: { select: { id: true, name: true } },
          ingredient: { select: { id: true, name: true, unit: true } },
        },
      }),
      this.prisma.product.findMany({
        where: { status: { not: 'INACTIVO' } },
        orderBy: [{ stock: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.ingredient.findMany({
        orderBy: [{ quantity: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.activityLog.findMany({
        where: {
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { name: true } },
        },
      }),
    ]);

    const sales = transactions.filter((tx) => tx.type === 'VENTA');
    const totalVentas = this.sumTransactions(transactions, ['VENTA']);
    const totalIngresosCaja = this.sumTransactions(transactions, [
      'VENTA',
      'INGRESO',
    ]);
    const totalEgresosCaja = this.sumTransactions(transactions, [
      'GASTO',
      'EGRESO',
      'DEVOLUCION',
      'COTIZACION',
    ]);
    const totalFacturado = invoices.reduce(
      (acc, invoice) => acc + Number(invoice.total),
      0,
    );
    const productosVendidos = sales.reduce(
      (acc, tx) => acc + (tx.productQty ?? 0),
      0,
    );
    const saldoInicial = Number(register.openingBalance);
    const saldoEsperado = Number(
      register.expectedBalance ??
        transactions.at(-1)?.balanceAfter ??
        register.openingBalance,
    );
    const dineroContado =
      register.closingBalance === null || register.closingBalance === undefined
        ? null
        : Number(register.closingBalance);
    const diferencia =
      dineroContado === null ? null : Number(dineroContado - saldoEsperado);
    const promedioVenta = sales.length > 0 ? totalVentas / sales.length : 0;

    return {
      register,
      periodStart,
      periodEnd,
      transactions,
      sales,
      invoices,
      movements,
      lowProducts: products.filter((p) => p.stock <= p.minStock),
      lowIngredients: ingredients.filter(
        (i) => Number(i.quantity) <= Number(i.minStock),
      ),
      activity: activity.filter((item) => this.isRelevantActivity(item)),
      totals: {
        totalVentas,
        totalIngresosCaja,
        totalEgresosCaja,
        totalFacturado,
        productosVendidos,
        saldoInicial,
        saldoEsperado,
        dineroContado,
        diferencia,
        promedioVenta,
      },
    };
  }

  private buildDailySummarySheet(workbook: ExcelJS.Workbook, data: ReportData) {
    const sheet = workbook.addWorksheet('Resumen Diario', {
      properties: { tabColor: { argb: 'FFB45309' } },
    });
    sheet.views = [{ state: 'frozen', ySplit: 7 }];
    sheet.columns = [
      { key: 'concepto', width: 35 },
      { key: 'valor', width: 28 },
      { key: 'detalle', width: 55 },
    ];

    this.addReportHeader(sheet, 'Reporte diario de operaciones', data);

    this.addSectionTitle(sheet, 'Resumen de operaciones del día');
    const summaryHeader = sheet.addRow(['Indicador', 'Valor', 'Detalle']);
    this.setHeaderStyle(summaryHeader);

    this.addSummaryRow(sheet, 'Total de ventas del día', data.totals.totalVentas);
    this.addSummaryRow(sheet, 'Número de ventas', data.sales.length, 'ventas');
    this.addSummaryRow(sheet, 'Total facturado', data.totals.totalFacturado);
    this.addSummaryRow(sheet, 'Número de facturas', data.invoices.length, 'facturas');
    this.addSummaryRow(
      sheet,
      'Total ingresos de caja',
      data.totals.totalIngresosCaja,
    );
    this.addSummaryRow(
      sheet,
      'Total egresos de caja',
      data.totals.totalEgresosCaja,
    );
    this.addSummaryRow(sheet, 'Saldo esperado', data.totals.saldoEsperado);
    this.addSummaryRow(
      sheet,
      'Diferencia de cierre',
      data.totals.diferencia,
      this.getCashStatus(data.totals.diferencia),
    );
    this.addSummaryRow(
      sheet,
      'Movimientos de inventario',
      data.movements.length,
      'movimientos',
    );
    this.addSummaryRow(
      sheet,
      'Productos e insumos bajo stock',
      data.lowProducts.length + data.lowIngredients.length,
      'requieren revisión',
    );

    sheet.addRow([]);
    this.addSectionTitle(sheet, 'Observaciones automáticas');
    const observations = this.buildObservations(data);
    observations.forEach((observation) => {
      const row = sheet.addRow(['', observation, '']);
      sheet.mergeCells(row.number, 2, row.number, 3);
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    });

    this.applyTableBorders(sheet, summaryHeader.number, summaryHeader.number + 10);
  }

  private buildCashSheet(workbook: ExcelJS.Workbook, data: ReportData) {
    const sheet = workbook.addWorksheet('Caja', {
      properties: { tabColor: { argb: 'FF451A03' } },
    });
    sheet.views = [{ state: 'frozen', ySplit: 9 }];

    this.addReportHeader(sheet, 'Resumen de caja', data);

    this.addSectionTitle(sheet, 'Apertura de caja');
    const openingHeader = sheet.addRow(['Fecha/hora', 'Saldo inicial', 'Usuario que abrió']);
    this.setHeaderStyle(openingHeader);
    const openingRow = sheet.addRow([
      data.register.openedAt,
      data.totals.saldoInicial,
      this.clean(data.register.openedBy?.name),
    ]);
    openingRow.getCell(1).numFmt = this.dateFormat;
    openingRow.getCell(2).numFmt = this.currencyFormat;
    this.applyTableBorders(sheet, openingHeader.number, openingRow.number);

    sheet.addRow([]);
    this.addSectionTitle(sheet, 'Movimientos registrados en caja');
    const cashHeader = sheet.addRow([
      'Hora',
      'Tipo',
      'Descripción',
      'Método de pago',
      'Referencia',
      'Valor entrada',
      'Valor salida',
      'Usuario',
    ]);
    this.setHeaderStyle(cashHeader);
    this.setAutoFilter(sheet, cashHeader.number, 8);

    if (data.transactions.length === 0) {
      this.addEmptyRow(sheet, cashHeader.number, 8, 'Sin movimientos de caja');
    } else {
      data.transactions.forEach((transaction) => {
        const isCredit = ['VENTA', 'INGRESO'].includes(transaction.type);
        const amount = Number(transaction.amount);
        const row = sheet.addRow([
          transaction.createdAt,
          this.readableCashType(transaction.type),
          this.clean(transaction.description),
          'No registrado',
          this.clean(transaction.reference),
          isCredit ? amount : 0,
          isCredit ? 0 : amount,
          this.clean(transaction.user?.name),
        ]);
        row.getCell(1).numFmt = this.dateFormat;
        row.getCell(6).numFmt = this.currencyFormat;
        row.getCell(7).numFmt = this.currencyFormat;
        this.applyTypeFill(row.getCell(2), transaction.type);
      });
      this.applyZebra(sheet, cashHeader.number + 1);
    }
    this.applyTableBorders(sheet, cashHeader.number, sheet.rowCount);

    sheet.addRow([]);
    this.addSectionTitle(sheet, 'Cierre de caja');
    const closingHeader = sheet.addRow([
      'Saldo inicial',
      'Total ingresos',
      'Total egresos',
      'Saldo esperado',
      'Dinero físico contado',
      'Diferencia',
      'Estado',
    ]);
    this.setHeaderStyle(closingHeader);
    const closingRow = sheet.addRow([
      data.totals.saldoInicial,
      data.totals.totalIngresosCaja,
      data.totals.totalEgresosCaja,
      data.totals.saldoEsperado,
      data.totals.dineroContado ?? 'No registrado',
      data.totals.diferencia ?? 'No registrado',
      this.getCashStatus(data.totals.diferencia),
    ]);
    [1, 2, 3, 4, 5, 6].forEach((cell) => {
      if (typeof closingRow.getCell(cell).value === 'number') {
        closingRow.getCell(cell).numFmt = this.currencyFormat;
      }
    });
    closingRow.font = { bold: true };
    this.applyTableBorders(sheet, closingHeader.number, closingRow.number);
  }

  private buildSalesSheet(workbook: ExcelJS.Workbook, data: ReportData) {
    const sheet = workbook.addWorksheet('Ventas', {
      properties: { tabColor: { argb: 'FFF97316' } },
    });
    sheet.views = [{ state: 'frozen', ySplit: 5 }];
    this.addReportHeader(sheet, 'Ventas realizadas', data);

    const header = sheet.addRow([
      'Hora',
      'Producto',
      'Cantidad',
      'Precio unitario',
      'Total',
      'Método de pago',
      'Referencia',
      'Usuario',
      'Factura asociada',
    ]);
    this.setHeaderStyle(header);
    this.setAutoFilter(sheet, header.number, 9);

    if (data.sales.length === 0) {
      this.addEmptyRow(sheet, header.number, 9, 'Sin ventas registradas');
    } else {
      data.sales.forEach((sale) => {
        const unitPrice = this.getUnitPrice(sale);
        const row = sheet.addRow([
          sale.createdAt,
          this.clean(sale.product?.name ?? sale.description),
          sale.productQty ?? 1,
          unitPrice,
          Number(sale.amount),
          'No registrado',
          this.clean(sale.reference),
          this.clean(sale.user?.name),
          this.clean(sale.reference),
        ]);
        row.getCell(1).numFmt = this.dateFormat;
        row.getCell(4).numFmt = this.currencyFormat;
        row.getCell(5).numFmt = this.currencyFormat;
      });
      this.applyZebra(sheet, header.number + 1);
    }

    sheet.addRow([]);
    const totalHeader = sheet.addRow(['Total ventas', 'Productos vendidos', 'Promedio por venta']);
    this.setHeaderStyle(totalHeader);
    const totalRow = sheet.addRow([
      data.totals.totalVentas,
      data.totals.productosVendidos,
      data.totals.promedioVenta,
    ]);
    totalRow.getCell(1).numFmt = this.currencyFormat;
    totalRow.getCell(3).numFmt = this.currencyFormat;
    totalRow.font = { bold: true };
    this.applyTableBorders(sheet, header.number, sheet.rowCount);
  }

  private buildInvoicesSheet(workbook: ExcelJS.Workbook, data: ReportData) {
    const sheet = workbook.addWorksheet('Facturas', {
      properties: { tabColor: { argb: 'FF92400E' } },
    });
    sheet.views = [{ state: 'frozen', ySplit: 5 }];
    this.addReportHeader(sheet, 'Facturas emitidas', data);

    if (data.invoices.length === 0) {
      const row = sheet.addRow(['Sin facturas registradas']);
      row.font = { italic: true, color: { argb: this.subtitleColor } };
      return;
    }

    data.invoices.forEach((invoice, index) => {
      this.addSectionTitle(sheet, `Factura ${invoice.number}`);
      const invoiceHeader = sheet.addRow([
        'Número de factura',
        'Fecha/hora',
        'Cliente',
        'Documento cliente',
        'Total',
        'Estado',
        'Referencia de caja',
      ]);
      this.setHeaderStyle(invoiceHeader);
      const invoiceRow = sheet.addRow([
        invoice.number,
        invoice.createdAt,
        'No registrado',
        'No registrado',
        Number(invoice.total),
        this.clean(invoice.status),
        this.findCashReferenceForInvoice(data.transactions, invoice.number),
      ]);
      invoiceRow.getCell(2).numFmt = this.dateFormat;
      invoiceRow.getCell(5).numFmt = this.currencyFormat;
      this.applyTableBorders(sheet, invoiceHeader.number, invoiceRow.number);

      const itemHeader = sheet.addRow(['Producto', 'Cantidad', 'Precio unitario', 'Subtotal']);
      this.setHeaderStyle(itemHeader);
      invoice.items.forEach((item) => {
        const itemRow = sheet.addRow([
          this.clean(item.product?.name ?? item.description),
          item.quantity,
          Number(item.unitPrice),
          Number(item.total),
        ]);
        itemRow.getCell(3).numFmt = this.currencyFormat;
        itemRow.getCell(4).numFmt = this.currencyFormat;
      });
      this.applyTableBorders(sheet, itemHeader.number, sheet.rowCount);
      if (index < data.invoices.length - 1) sheet.addRow([]);
    });
  }

  private buildMovementsSheet(workbook: ExcelJS.Workbook, data: ReportData) {
    const sheet = workbook.addWorksheet('Movimientos Inventario', {
      properties: { tabColor: { argb: 'FF78350F' } },
    });
    sheet.views = [{ state: 'frozen', ySplit: 5 }];
    this.addReportHeader(sheet, 'Movimientos de inventario', data);

    const header = sheet.addRow([
      'Hora',
      'Tipo de movimiento',
      'Producto o insumo',
      'Cantidad',
      'Stock anterior',
      'Stock nuevo',
      'Motivo',
      'Referencia',
      'Usuario',
    ]);
    this.setHeaderStyle(header);
    this.setAutoFilter(sheet, header.number, 9);

    if (data.movements.length === 0) {
      this.addEmptyRow(sheet, header.number, 9, 'Sin movimientos de inventario');
    } else {
      data.movements.forEach((movement) => {
        const row = sheet.addRow([
          movement.createdAt,
          this.readableMovementType(movement.type, movement.referenceType),
          this.clean(
            movement.product?.name ??
              `${movement.ingredient?.name ?? 'Sin información'} ${
                movement.ingredient?.unit ? `(${movement.ingredient.unit})` : ''
              }`,
          ),
          Number(movement.quantity),
          'Sin información',
          'Sin información',
          this.clean(movement.notes),
          this.clean(movement.referenceType),
          this.clean(movement.user?.name),
        ]);
        row.getCell(1).numFmt = this.dateFormat;
        this.applyTypeFill(row.getCell(2), movement.referenceType ?? movement.type);
      });
      this.applyZebra(sheet, header.number + 1);
    }
    this.applyTableBorders(sheet, header.number, sheet.rowCount);
  }

  private buildLowStockSheet(workbook: ExcelJS.Workbook, data: ReportData) {
    const sheet = workbook.addWorksheet('Bajo Stock', {
      properties: { tabColor: { argb: 'FFDC2626' } },
    });
    sheet.views = [{ state: 'frozen', ySplit: 5 }];
    this.addReportHeader(sheet, 'Productos que requieren revisión de stock', data);

    const header = sheet.addRow([
      'Producto/Insumo',
      'Tipo',
      'Stock actual',
      'Stock mínimo',
      'Diferencia',
      'Estado',
    ]);
    this.setHeaderStyle(header);
    this.setAutoFilter(sheet, header.number, 6);

    const rows = [
      ...data.lowProducts.map((product) => ({
        name: product.name,
        type: 'Producto',
        current: product.stock,
        min: product.minStock,
      })),
      ...data.lowIngredients.map((ingredient) => ({
        name: `${ingredient.name} (${ingredient.unit})`,
        type: 'Insumo',
        current: Number(ingredient.quantity),
        min: Number(ingredient.minStock),
      })),
    ];

    if (rows.length === 0) {
      this.addEmptyRow(sheet, header.number, 6, 'Sin productos o insumos bajo stock');
    } else {
      rows.forEach((item) => {
        const difference = item.current - item.min;
        const state = this.getStockStatus(item.current, item.min);
        const row = sheet.addRow([
          this.clean(item.name),
          item.type,
          item.current,
          item.min,
          difference,
          state,
        ]);
        if (state === 'Crítico') {
          row.getCell(6).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' },
          };
          row.getCell(6).font = { bold: true, color: { argb: 'FF991B1B' } };
        }
      });
      this.applyZebra(sheet, header.number + 1);
    }
    this.applyTableBorders(sheet, header.number, sheet.rowCount);
  }

  private buildActivitySheet(workbook: ExcelJS.Workbook, data: ReportData) {
    const sheet = workbook.addWorksheet('Actividad', {
      properties: { tabColor: { argb: 'FF2563EB' } },
    });
    sheet.views = [{ state: 'frozen', ySplit: 5 }];
    this.addReportHeader(sheet, 'Actividad o auditoría relevante', data);

    const header = sheet.addRow(['Hora', 'Usuario', 'Acción', 'Módulo', 'Descripción']);
    this.setHeaderStyle(header);
    this.setAutoFilter(sheet, header.number, 5);

    if (data.activity.length === 0) {
      this.addEmptyRow(sheet, header.number, 5, 'Sin actividad relevante registrada');
    } else {
      data.activity.forEach((activity) => {
        const row = sheet.addRow([
          activity.createdAt,
          this.clean(activity.user?.name),
          this.clean(activity.action),
          this.clean(activity.entity),
          this.describeActivity(activity.details),
        ]);
        row.getCell(1).numFmt = this.dateFormat;
      });
      this.applyZebra(sheet, header.number + 1);
    }
    this.applyTableBorders(sheet, header.number, sheet.rowCount);
  }

  private addReportHeader(
    sheet: ExcelJS.Worksheet,
    title: string,
    data: ReportData,
  ) {
    sheet.mergeCells('A1:I1');
    const businessRow = sheet.getRow(1);
    businessRow.getCell(1).value = 'Dulce Colonial';
    businessRow.getCell(1).font = {
      bold: true,
      size: 20,
      color: { argb: this.titleColor },
    };
    businessRow.getCell(1).alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:I2');
    const titleRow = sheet.getRow(2);
    titleRow.getCell(1).value = title;
    titleRow.getCell(1).font = {
      bold: true,
      size: 15,
      color: { argb: this.subtitleColor },
    };
    titleRow.getCell(1).alignment = { horizontal: 'center' };

    const generatedAt = new Date();
    const responsible =
      data.register.closedBy?.name ?? data.register.openedBy?.name ?? 'No registrado';
    sheet.addRow(['Fecha del reporte', generatedAt, 'Usuario responsable', responsible]);
    sheet.addRow(['Período', data.periodStart, 'Hasta', data.periodEnd]);
    sheet.addRow([]);
    [3, 4].forEach((rowNumber) => {
      const row = sheet.getRow(rowNumber);
      row.getCell(2).numFmt = this.dateFormat;
      row.getCell(4).numFmt = this.dateFormat;
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle' };
      });
    });
  }

  private addSectionTitle(sheet: ExcelJS.Worksheet, title: string) {
    const row = sheet.addRow([title]);
    const lastColumn = Math.max(sheet.columnCount, 1);
    sheet.mergeCells(row.number, 1, row.number, lastColumn);
    row.getCell(1).font = {
      bold: true,
      size: 13,
      color: { argb: this.titleColor },
    };
    row.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: this.lightFill },
    };
  }

  private addSummaryRow(
    sheet: ExcelJS.Worksheet,
    label: string,
    value: number | null,
    detail = '',
  ) {
    const printableValue = value === null ? 'No registrado' : value;
    const row = sheet.addRow([label, printableValue, detail]);
    if (typeof printableValue === 'number') {
      const currencyLabels = [
        'Total de ventas del día',
        'Total facturado',
        'Total ingresos de caja',
        'Total egresos de caja',
        'Saldo esperado',
        'Diferencia de cierre',
      ];
      row.getCell(2).numFmt = currencyLabels.includes(label)
        ? this.currencyFormat
        : '0';
    }
  }

  private addEmptyRow(
    sheet: ExcelJS.Worksheet,
    headerRowNumber: number,
    columns: number,
    message: string,
  ) {
    const row = sheet.addRow([message]);
    sheet.mergeCells(row.number, 1, row.number, columns);
    row.getCell(1).font = { italic: true, color: { argb: this.subtitleColor } };
    row.getCell(1).alignment = { horizontal: 'center' };
    this.applyTableBorders(sheet, headerRowNumber, row.number);
  }

  private buildObservations(data: ReportData): string[] {
    const observations = [
      `Durante el día se registraron ${data.sales.length} ventas por un valor total de ${this.formatCurrency(data.totals.totalVentas)}. Se generaron ${data.invoices.length} facturas y se realizaron ${data.movements.length} movimientos de inventario.`,
    ];

    const cashStatus = this.getCashStatus(data.totals.diferencia);
    observations.push(`El cierre de caja quedó en estado: ${cashStatus}.`);

    const lowStockCount = data.lowProducts.length + data.lowIngredients.length;
    observations.push(
      lowStockCount > 0
        ? `Hay ${lowStockCount} productos o insumos que requieren revisión de stock.`
        : 'No se detectaron productos o insumos bajo stock mínimo.',
    );

    if (data.activity.length === 0) {
      observations.push('No se encontró actividad de auditoría relevante para el período.');
    }

    return observations;
  }

  private getCashStatus(difference: number | null) {
    if (difference === null) return 'No registrado';
    if (difference === 0) return 'Cuadrada';
    return difference > 0 ? 'Sobrante' : 'Faltante';
  }

  private getStockStatus(current: number, min: number) {
    if (current <= 0) return 'Crítico';
    if (current <= min) return 'Bajo';
    return 'OK';
  }

  private getUnitPrice(sale: TransactionWithRelations) {
    if (sale.productPrice !== null && sale.productPrice !== undefined) {
      return Number(sale.productPrice);
    }
    if (sale.productQty) {
      return Number(sale.amount) / sale.productQty;
    }
    return Number(sale.amount);
  }

  private findCashReferenceForInvoice(
    transactions: TransactionWithRelations[],
    invoiceNumber: string,
  ) {
    const transaction = transactions.find((tx) => tx.reference === invoiceNumber);
    return this.clean(transaction?.reference ?? invoiceNumber);
  }

  private readableCashType(type: string) {
    const labels: Record<string, string> = {
      VENTA: 'Venta',
      INGRESO: 'Ingreso',
      GASTO: 'Gasto',
      EGRESO: 'Egreso',
      DEVOLUCION: 'Devolución',
      COTIZACION: 'Cotización',
    };
    return labels[type] ?? this.clean(type);
  }

  private readableMovementType(type: string, referenceType?: string | null) {
    if (referenceType === 'VENTA') return 'Venta';
    const labels: Record<string, string> = {
      ENTRADA: 'Entrada',
      SALIDA: 'Salida',
      AJUSTE: 'Ajuste',
      MERMA: 'Merma',
    };
    return labels[type] ?? this.clean(type);
  }

  private isRelevantActivity(activity: ActivityWithUser) {
    const entity = activity.entity?.toLowerCase() ?? '';
    return ['cash', 'products', 'inventory', 'movements', 'invoices', 'reports'].some(
      (item) => entity.includes(item),
    );
  }

  private describeActivity(details: Prisma.JsonValue | null) {
    if (!details) return 'Sin información';
    if (typeof details === 'string') return this.clean(details);
    if (typeof details === 'number' || typeof details === 'boolean') {
      return String(details);
    }
    if (Array.isArray(details)) {
      return details.map((item) => this.clean(String(item))).join(', ');
    }
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${this.clean(String(value))}`)
      .join('; ');
  }

  private sumTransactions(
    transactions: TransactionWithRelations[],
    types: string[],
  ): number {
    const allowed = new Set(types);
    return transactions.reduce((acc, tx) => {
      if (!allowed.has(tx.type)) return acc;
      return acc + Number(tx.amount);
    }, 0);
  }

  private clean(value: unknown): string {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      value === 'undefined' ||
      value === 'null' ||
      value === 'NaN' ||
      value === '[object Object]'
    ) {
      return 'Sin información';
    }
    return String(value);
  }

  private formatCurrency(value: number) {
    return `$${Math.round(value).toLocaleString('es-CO')} COP`;
  }

  private setHeaderStyle(row: ExcelJS.Row) {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: this.headerColor },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = this.getBorder();
    });
  }

  private applyZebra(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    endRow = sheet.rowCount,
  ) {
    let toggle = 0;
    for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      if (!row || row.cellCount === 0) continue;
      const color = toggle % 2 === 0 ? 'FFFFFFFF' : this.zebraAltColor;
      row.eachCell((cell) => {
        if (!cell.fill || !('fgColor' in cell.fill)) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color },
          };
        }
        cell.border = this.getBorder();
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
      toggle += 1;
    }
  }

  private applyTableBorders(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    endRow: number,
  ) {
    for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
      sheet.getRow(rowNumber).eachCell((cell) => {
        cell.border = this.getBorder();
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    }
  }

  private applyTypeFill(cell: ExcelJS.Cell, type: string) {
    const normalized = type.toUpperCase();
    const colors: Record<string, string> = {
      ENTRADA: 'FFD1FAE5',
      INGRESO: 'FFD1FAE5',
      SALIDA: 'FFFFEDD5',
      VENTA: 'FFDBEAFE',
      AJUSTE: 'FFE0E7FF',
      MERMA: 'FFFEE2E2',
      GASTO: 'FFFEE2E2',
      EGRESO: 'FFFEE2E2',
      DEVOLUCION: 'FFFCE7F3',
      COTIZACION: 'FFF3F4F6',
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors[normalized] ?? 'FFFFFFFF' },
    };
    cell.font = { bold: true, color: { argb: this.titleColor } };
  }

  private setAutoFilter(
    sheet: ExcelJS.Worksheet,
    headerRowNumber: number,
    columnCount: number,
  ) {
    sheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: columnCount },
    };
  }

  private getBorder(): Partial<ExcelJS.Borders> {
    return {
      top: { style: 'thin', color: { argb: this.borderColor } },
      left: { style: 'thin', color: { argb: this.borderColor } },
      bottom: { style: 'thin', color: { argb: this.borderColor } },
      right: { style: 'thin', color: { argb: this.borderColor } },
    };
  }

  private autoFitColumns(
    sheet: ExcelJS.Worksheet,
    minWidth = 12,
    maxWidth = 44,
  ) {
    sheet.columns?.forEach((column) => {
      if (!column || !column.eachCell) return;
      let max = minWidth;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const text = this.stringifyCellValue(cell.value);
        if (text.length > max) max = text.length;
      });
      column.width = Math.max(Math.min(max + 2, maxWidth), minWidth);
    });
  }

  private stringifyCellValue(value: ExcelJS.CellValue | undefined): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string' || typeof value === 'number') {
      return value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object') {
      if ('formula' in value) {
        const result = value.result;
        return typeof result === 'number' || typeof result === 'string'
          ? result.toString()
          : '';
      }
      if ('richText' in value) {
        return value.richText.map((item) => item.text).join('');
      }
      if ('text' in value && typeof value.text === 'string') {
        return value.text;
      }
    }
    return '';
  }
}
