export interface InvoiceItem {
  id: number;
  productId: number;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  total?: number;
}

export interface Invoice {
  id: number;
  number: string;
  cashRegisterId: number;
  userId: number;
  userName?: string;
  customerName?: string;
  customerDocument?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  discount?: number;
  tax?: number;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  status: 'EMITIDA' | 'ANULADA';
  createdAt: string;
  updatedAt?: string;
}

export interface CreateInvoicePayload {
  cashRegisterId: number;
  items: { productId: number; quantity: number }[];
}
