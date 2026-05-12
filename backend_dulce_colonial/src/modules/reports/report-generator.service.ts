import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { REPORT_THEME, formatReportDate, formatReportNumber } from './report-theme';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { Prisma, Ingredient, Product, Movement } from '@prisma/client';

type MovementWithRelations = Movement & {
  product: { name: string | null } | null;
  ingredient: { name: string | null; unit: string | null } | null;
  user: { name: string | null } | null;
};

type LowIngredientRow = {
  id: number;
  name: string;
  quantity: Prisma.Decimal | number;
  min_stock: Prisma.Decimal | number;
  unit: string;
};

type PdfDoc = InstanceType<typeof PDFDocument>;

type PdfTableColumn = {
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
};

type PdfTableRow = Array<string | number>;

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);
  private readonly reportsDir: string;

  constructor(private readonly config: ConfigService) {
    this.reportsDir = path.resolve(
      process.cwd(),
      this.config.get('REPORTS_DIR', '../reports'),
    );
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // ─── Excel: Stock actual ──────────────────────────────────────────────────
  async generateStockExcel(data: {
    products: Product[];
    ingredients: Ingredient[];
  }): Promise<string> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Dulce Colonial';
    wb.created = new Date();

    // Hoja productos
    const wsProducts = wb.addWorksheet('Productos');
    wsProducts.columns = [
      { header: 'ID', key: 'id', width: 6 },
      { header: 'Nombre', key: 'name', width: 28 },
      { header: 'Categoría', key: 'category', width: 18 },
      { header: 'Precio', key: 'price', width: 14 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Estado', key: 'status', width: 12 },
    ];
    this.styleHeader(wsProducts);

    data.products.forEach((p) => {
      const row = wsProducts.addRow({
        id: p.id,
        name: p.name,
        category: p.category,
        price: Number(p.price),
        stock: p.stock,
        status: p.status,
      });
      if (p.stock <= 2) {
        row.getCell('stock').font = { color: { argb: 'FFCC0000' }, bold: true };
      }
      if (p.status === 'AGOTADO') {
        row.getCell('status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFDE8E8' },
        };
      }
    });

    // Hoja ingredientes
    const wsIng = wb.addWorksheet('Insumos');
    wsIng.columns = [
      { header: 'ID', key: 'id', width: 6 },
      { header: 'Nombre', key: 'name', width: 28 },
      { header: 'Unidad', key: 'unit', width: 10 },
      { header: 'Cantidad', key: 'quantity', width: 14 },
      { header: 'Stock mín.', key: 'minStock', width: 12 },
      { header: 'Estado', key: 'estado', width: 16 },
    ];
    this.styleHeader(wsIng);

    data.ingredients.forEach((i) => {
      const qty = Number(i.quantity);
      const min = Number(i.minStock);
      const estado = qty <= 0 ? 'SIN STOCK' : qty <= min ? 'BAJO MÍNIMO' : 'OK';
      const row = wsIng.addRow({
        id: i.id,
        name: i.name,
        unit: i.unit,
        quantity: qty.toFixed(3),
        minStock: min.toFixed(3),
        estado,
      });
      if (qty <= min) {
        row.getCell('quantity').font = {
          color: { argb: 'FFCC0000' },
          bold: true,
        };
        row.getCell('estado').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3CD' },
        };
      }
    });

    const fileName = `stock_${this.dateStamp()}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);
    await wb.xlsx.writeFile(filePath);
    this.logger.log(`📊 Excel generado: ${fileName}`);
    return filePath;
  }

  // ─── Excel: Movimientos ───────────────────────────────────────────────────
  async generateMovementsExcel(
    movements: MovementWithRelations[],
    period: string,
  ): Promise<string> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Movimientos');

    ws.columns = [
      { header: 'Fecha', key: 'date', width: 18 },
      { header: 'Tipo', key: 'type', width: 12 },
      { header: 'Entidad', key: 'entity', width: 28 },
      { header: 'Tipo ref.', key: 'refType', width: 14 },
      { header: 'Cantidad', key: 'quantity', width: 12 },
      { header: 'Motivo', key: 'reason', width: 24 },
      { header: 'Usuario', key: 'user', width: 18 },
    ];
    this.styleHeader(ws);

    const typeColors: Record<string, string> = {
      ENTRADA: 'FFD4EDDA',
      SALIDA: 'FFFFF3CD',
      MERMA: 'FFFDE8E8',
      AJUSTE: 'FFD1ECF1',
    };

    movements.forEach((m) => {
      const row = ws.addRow({
        date: new Date(m.createdAt).toLocaleString('es-CO'),
        type: m.type,
        entity: m.product?.name || m.ingredient?.name || '—',
        refType: m.referenceType,
        quantity: Number(m.quantity),
        reason: m.notes || '—',
        user: m.user?.name,
      });
      const color = typeColors[m.type];
      if (color) {
        row.getCell('type').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: color },
        };
      }
    });

    const fileName = `movimientos_${period}_${this.dateStamp()}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);
    await wb.xlsx.writeFile(filePath);
    this.logger.log(`📊 Excel movimientos generado: ${fileName}`);
    return filePath;
  }

  // ─── PDF: Reporte de bajo inventario ─────────────────────────────────────
  async generateLowStockPDF(data: {
    lowProducts: Product[];
    lowIngredients: LowIngredientRow[];
  }): Promise<string> {
    const fileName = `bajo_inventario_${this.dateStamp()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      this.drawLowStockPdfHeader(doc);
      this.drawLowStockSummary(
        doc,
        data.lowProducts.length,
        data.lowIngredients.length,
      );

      this.drawPdfSectionTitle(doc, 'Productos con stock bajo o agotado');
      this.drawPdfTable(
        doc,
        [
          { label: 'Producto', width: 220 },
          { label: 'Stock', width: 70, align: 'right' },
          { label: 'Mínimo', width: 70, align: 'right' },
          { label: 'Estado', width: 120 },
        ],
        data.lowProducts.map((product) => [
          product.name,
          formatReportNumber(product.stock),
          '2',
          product.status,
        ]),
        'No hay productos con stock bajo o agotado.',
      );

      this.drawPdfSectionTitle(doc, 'Insumos bajo stock mínimo');
      this.drawPdfTable(
        doc,
        [
          { label: 'Insumo', width: 190 },
          { label: 'Actual', width: 85, align: 'right' },
          { label: 'Mínimo', width: 85, align: 'right' },
          { label: 'Unidad', width: 65 },
          { label: 'Estado', width: 70 },
        ],
        data.lowIngredients.map((ingredient) => [
          ingredient.name,
          formatReportNumber(ingredient.quantity),
          formatReportNumber(ingredient.min_stock),
          ingredient.unit,
          Number(ingredient.quantity) <= 0 ? 'Sin stock' : 'Bajo',
        ]),
        'No hay insumos bajo el stock mínimo.',
      );

      this.drawPdfFooter(doc);

      doc.end();
      stream.on('finish', () => {
        this.logger.log(`📄 PDF generado: ${fileName}`);
        resolve(filePath);
      });
      stream.on('error', reject);
    });
  }

  private drawLowStockPdfHeader(doc: PdfDoc) {
    const { colors } = REPORT_THEME;

    doc.rect(50, 45, 495, 78).fill(colors.primary);

    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor('#ffffff')
      .text(REPORT_THEME.brandName, 70, 63, { width: 455 });

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#f8e8df')
      .text(REPORT_THEME.subtitle, 70, 88, { width: 455 });

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#ffffff')
      .text('Reporte de Bajo Inventario', 70, 104, { width: 455 });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(colors.muted)
      .text(`Generado: ${formatReportDate()}`, 50, 138, {
        align: 'right',
        width: 495,
      });

    doc.y = 165;
  }

  private drawLowStockSummary(
    doc: PdfDoc,
    lowProductsCount: number,
    lowIngredientsCount: number,
  ) {
    const totalAlerts = lowProductsCount + lowIngredientsCount;
    const cards = [
      ['Productos críticos', lowProductsCount],
      ['Insumos críticos', lowIngredientsCount],
      ['Alertas totales', totalAlerts],
    ];

    const cardWidth = 155;
    const cardHeight = 56;
    const gap = 15;
    let x = 50;
    const y = doc.y;

    cards.forEach(([label, value]) => {
      doc
        .roundedRect(x, y, cardWidth, cardHeight, 8)
        .fillAndStroke(REPORT_THEME.colors.background, REPORT_THEME.colors.border);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(REPORT_THEME.colors.muted)
        .text(String(label), x + 12, y + 12, { width: cardWidth - 24 });

      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(
          Number(value) > 0 ? REPORT_THEME.colors.danger : REPORT_THEME.colors.success,
        )
        .text(String(value), x + 12, y + 29, { width: cardWidth - 24 });

      x += cardWidth + gap;
    });

    doc.y = y + cardHeight + 24;
  }

  private drawPdfSectionTitle(doc: PdfDoc, title: string) {
    this.ensurePdfSpace(doc, 55);

    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(REPORT_THEME.colors.primary)
      .text(title, 50, doc.y);

    doc.moveDown(0.5);
  }

  private drawPdfTable(
    doc: PdfDoc,
    columns: PdfTableColumn[],
    rows: PdfTableRow[],
    emptyMessage: string,
  ) {
    const startX = 50;
    const rowHeight = 24;

    this.drawPdfTableHeader(doc, columns, startX, rowHeight);

    if (rows.length === 0) {
      this.ensurePdfSpace(doc, rowHeight + 8);
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(REPORT_THEME.colors.muted)
        .text(emptyMessage, startX + 8, doc.y + 7, { width: 480 });

      doc.y += rowHeight + 12;
      return;
    }

    rows.forEach((row, rowIndex) => {
      if (doc.y + rowHeight > 740) {
        doc.addPage();
        doc.y = 60;
        this.drawPdfTableHeader(doc, columns, startX, rowHeight);
      }

      const y = doc.y;

      if (rowIndex % 2 === 0) {
        doc
          .rect(startX, y, 495, rowHeight)
          .fill(REPORT_THEME.colors.tableRowAlt);
      }

      let x = startX;

      row.forEach((value, columnIndex) => {
        const column = columns[columnIndex];
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(REPORT_THEME.colors.text)
          .text(String(value ?? '—'), x + 6, y + 7, {
            width: column.width - 12,
            align: column.align ?? 'left',
            ellipsis: true,
          });

        x += column.width;
      });

      doc
        .rect(startX, y, 495, rowHeight)
        .strokeColor(REPORT_THEME.colors.border)
        .lineWidth(0.5)
        .stroke();

      doc.y = y + rowHeight;
    });

    doc.moveDown(1);
  }

  private drawPdfTableHeader(
    doc: PdfDoc,
    columns: PdfTableColumn[],
    startX: number,
    rowHeight: number,
  ) {
    this.ensurePdfSpace(doc, rowHeight + 8);

    const y = doc.y;
    doc
      .rect(startX, y, 495, rowHeight)
      .fill(REPORT_THEME.colors.tableHeader);

    let x = startX;

    columns.forEach((column) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(REPORT_THEME.colors.tableHeaderText)
        .text(column.label, x + 6, y + 7, {
          width: column.width - 12,
          align: column.align ?? 'left',
        });

      x += column.width;
    });

    doc.y = y + rowHeight;
  }

  private ensurePdfSpace(doc: PdfDoc, neededHeight: number) {
    if (doc.y + neededHeight > 740) {
      doc.addPage();
      doc.y = 60;
    }
  }

  private drawPdfFooter(doc: PdfDoc) {
    const footerY = doc.page.height - 55;

    doc
      .moveTo(50, footerY - 10)
      .lineTo(545, footerY - 10)
      .strokeColor(REPORT_THEME.colors.border)
      .lineWidth(0.8)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(REPORT_THEME.colors.muted)
      .text(REPORT_THEME.footer, 50, footerY, {
        align: 'center',
        width: 495,
      });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private styleHeader(ws: ExcelJS.Worksheet) {
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3D1A00' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;
  }

  private dateStamp(): string {
    return new Date().toISOString().split('T')[0];
  }
}
