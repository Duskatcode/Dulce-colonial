import api from './api';

export const reportsService = {
  getStock: () =>
    api.get('/reports/stock').then(r => r.data),

  getMovements: (dateFrom?: string, dateTo?: string) =>
    api.get('/reports/movements', { params: { dateFrom, dateTo } }).then(r => r.data),

  getLowStock: () =>
    api.get('/reports/low-stock').then(r => r.data),

  getHistory: () =>
    api.get('/reports').then(r => r.data),
};