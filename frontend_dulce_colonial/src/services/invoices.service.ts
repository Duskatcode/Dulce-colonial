import api from './api';
import type { Invoice, CreateInvoicePayload } from '../types/invoice.types';

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  cashRegisterId?: number;
  startDate?: string;
  endDate?: string;
  number?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const invoicesService = {
  createInvoice: (payload: CreateInvoicePayload) =>
    api.post<Invoice>('/invoices', payload).then((res) => res.data),

  getInvoices: (filters: InvoiceFilters = {}) =>
    api.get<InvoiceListResponse>('/invoices', { params: filters }).then((res) => res.data),

  getInvoice: (id: number) =>
    api.get<Invoice>(`/invoices/${id}`).then((res) => res.data),

  getInvoicePdfUrl: (id: number) => `${API_BASE_URL}/invoices/${id}/pdf`,
};
export interface InvoiceListResponse {
  data: Invoice[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages?: number;
  };
}
