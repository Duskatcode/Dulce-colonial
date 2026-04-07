import api from './api';

export const cashService = {
  getStatus: () =>
    api.get('/cash/status').then(r => r.data),

  getSummary: (cashRegisterId?: number) =>
    api.get('/cash/summary', { params: { cashRegisterId } }).then(r => r.data),

  getRegisters: (page = 1) =>
    api.get('/cash/registers', { params: { page } }).then(r => r.data),

  getTransactions: (filters: any = {}) =>
    api.get('/cash/transactions', { params: filters }).then(r => r.data),

  openRegister: (data: { openingBalance: number; notes?: string }) =>
    api.post('/cash/open', data).then(r => r.data),

  closeRegister: (data: { closingBalance: number; notes?: string }) =>
    api.post('/cash/close', data).then(r => r.data),

  createTransaction: (data: {
    type:        string;
    amount:      number;
    description: string;
    reference?:  string;
    productId?:  number;
    productQty?: number;
  }) => api.post('/cash/transaction', data).then(r => r.data),
};