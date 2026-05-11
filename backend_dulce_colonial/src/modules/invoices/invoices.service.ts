import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FilterInvoicesDto } from './dto/filter-invoices.dto';

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

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: typeof invoiceInclude;
}>;

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async generateNumber(): Promise<string> {
    const lastInvoice = await this.prisma.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { number: true },
    });

    if (!lastInvoice?.number) {
      return 'FAC-0001';
    }

    const numericPart = lastInvoice.number.replace('FAC-', '');
    const current = Number.parseInt(numericPart, 10);
    const next = Number.isNaN(current) ? 1 : current + 1;
    return `FAC-${String(next).padStart(4, '0')}`;
  }

  async create(
    dto: CreateInvoiceDto,
    userId: number,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException(
        'La factura debe incluir al menos un producto.',
      );
    }

    const registerExists = await this.prisma.cashRegister.findUnique({
      where: { id: dto.cashRegisterId },
      select: { id: true },
    });
    if (!registerExists) {
      throw new NotFoundException('Caja no encontrada.');
    }

    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    let subtotalValue = 0;
    const itemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(
          `Producto #${item.productId} no encontrado.`,
        );
      }
      if (!product.price) {
        throw new BadRequestException(
          `El producto "${product.name}" no tiene un precio configurado.`,
        );
      }

      const unitPrice = Number(product.price.toNumber());
      const lineTotal = unitPrice * item.quantity;
      subtotalValue += lineTotal;

      return {
        productId: product.id,
        description: product.name,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(unitPrice),
        total: new Prisma.Decimal(lineTotal),
      };
    });

    const totalValue = subtotalValue;
    const invoiceNumber = await this.generateNumber();

    const invoice = await this.prisma.$transaction((tx) =>
      tx.invoice.create({
        data: {
          number: invoiceNumber,
          cashRegisterId: dto.cashRegisterId,
          userId,
          subtotal: new Prisma.Decimal(subtotalValue),
          total: new Prisma.Decimal(totalValue),
          items: {
            create: itemsData,
          },
        },
        include: invoiceInclude,
      }),
    );

    return this.formatInvoiceResponse(invoice);
  }

  async findAll(filters: FilterInvoicesDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};
    if (typeof filters.cashRegisterId === 'number') {
      where.cashRegisterId = filters.cashRegisterId;
    }
    if (filters.number) {
      where.number = { contains: filters.number, mode: 'insensitive' };
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      if (!isNaN(start.getTime())) {
        dateFilter.gte = start;
      }
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }
    if (Object.keys(dateFilter).length) {
      where.createdAt = dateFilter;
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: invoiceInclude,
      }),
    ]);

    return {
      data: data.map((invoice) => this.formatInvoiceResponse(invoice)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return this.formatInvoiceResponse(await this.findOneWithRelations(id));
  }

  async generatePdf(id: number): Promise<Buffer> {
    const invoice = await this.findOneWithRelations(id);
    const QRCode = require('qrcode');

    return new Promise<Buffer>(async (resolve, reject) => {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: { Title: `Factura ${invoice.number}` },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const brown = '#92400e';
      const lightBrown = '#fef3c7';
      const gray = '#6b7280';
      const pageWidth = doc.page.width - 100;

      doc.rect(50, 50, 60, 60).fill(brown);
      doc.fillColor('white').fontSize(8).text('LOGO', 65, 75);

      doc.fillColor(brown).fontSize(22).font('Helvetica-Bold');
      doc.text('DULCE COLONIAL', 125, 55);

      doc.fillColor(gray).fontSize(10).font('Helvetica');
      doc.text('Sistema de Gestión', 125, 82);

      const dateStr = new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(invoice.createdAt));

      doc.fillColor(brown).fontSize(14).font('Helvetica-Bold');
      doc.text(invoice.number, 400, 55, { width: 145, align: 'right' });

      doc.fillColor(gray).fontSize(9).font('Helvetica');
      doc.text(dateStr, 400, 75, { width: 145, align: 'right' });

      doc.moveDown(3);
      doc.moveTo(50, 125).lineTo(545, 125).strokeColor(brown).lineWidth(2).stroke();

      doc.fillColor(brown).fontSize(12).font('Helvetica-Bold');
      doc.text('DETALLE DE COMPRA', 50, 140);

      const tableTop = 165;
      const col = {
        product: 50,
        qty: 280,
        price: 340,
        total: 430,
      };

      doc.rect(50, tableTop - 5, pageWidth, 20).fill(brown);

      doc
        .fillColor('white')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('PRODUCTO', col.product, tableTop, { width: 220 })
        .text('CANT', col.qty, tableTop, { width: 50, align: 'center' })
        .text('P. UNIT', col.price, tableTop, { width: 80, align: 'right' })
        .text('SUBTOTAL', col.total, tableTop, { width: 80, align: 'right' });

      let currentY = tableTop + 25;
      const formatCOP = (n: number) =>
        new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
        }).format(n);

      invoice.items.forEach((item, index) => {
        if (index % 2 === 0) {
          doc.rect(50, currentY - 5, pageWidth, 18).fill(lightBrown);
        }

        const unitPrice = Number(item.unitPrice.toString());
        const subtotal = Number(item.total.toString());
        const productName = item.product?.name ?? item.description ?? 'Producto';

        doc
          .fillColor('#1f2937')
          .fontSize(9)
          .font('Helvetica')
          .text(productName, col.product, currentY, { width: 220 })
          .text(String(item.quantity), col.qty, currentY, {
            width: 50,
            align: 'center',
          })
          .text(formatCOP(unitPrice), col.price, currentY, {
            width: 80,
            align: 'right',
          })
          .text(formatCOP(subtotal), col.total, currentY, {
            width: 80,
            align: 'right',
          });

        currentY += 22;
      });

      doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor(brown).lineWidth(1).stroke();

      currentY += 10;

      doc.rect(350, currentY - 5, pageWidth - 300, 22).fill(brown);

      const invoiceTotal = Number(invoice.total.toString());

      doc
        .fillColor('white')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('TOTAL:', 360, currentY, { width: 60 })
        .text(formatCOP(invoiceTotal), col.total, currentY, {
          width: 80,
          align: 'right',
        });

      currentY += 40;

      try {
        const qrData = JSON.stringify({
          factura: invoice.number,
          total: invoiceTotal,
          fecha: invoice.createdAt,
        });
        const qrDataUrl = await QRCode.toDataURL(qrData, {
          width: 80,
          margin: 1,
        });
        const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(qrBase64, 'base64');

        doc.image(qrBuffer, 50, currentY, { width: 70, height: 70 });

        doc
          .fillColor(gray)
          .fontSize(7)
          .font('Helvetica')
          .text('Escanea para verificar', 50, currentY + 72, {
            width: 70,
            align: 'center',
          });
      } catch (qrErr) {
        console.error('[Invoice] QR generation failed:', qrErr);
      }

      doc
        .fillColor(gray)
        .fontSize(10)
        .font('Helvetica-Oblique')
        .text('¡Gracias por su compra!', 130, currentY + 25, {
          width: pageWidth - 80,
          align: 'center',
        });

      doc
        .moveTo(50, currentY + 90)
        .lineTo(545, currentY + 90)
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .stroke();

      doc
        .fillColor(gray)
        .fontSize(7)
        .text('Dulce Colonial — Sistema de Gestión', 50, currentY + 95, {
          width: pageWidth,
          align: 'center',
        });

      doc.end();
    });
  }

  private async findOneWithRelations(id: number): Promise<InvoiceWithRelations> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: invoiceInclude,
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada.');
    }

    return invoice;
  }

  private formatInvoiceResponse(invoice: InvoiceWithRelations) {
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
}
