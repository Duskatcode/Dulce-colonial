import api from './api';
import { Product, PaginatedResponse } from '../types';

export interface ProductFilters {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const productsService = {
  getAll: (filters: ProductFilters = {}) =>
    api.get<PaginatedResponse<Product>>('/products', { params: filters }).then(r => r.data),

  getOne: (id: number) =>
    api.get<Product>(`/products/${id}`).then(r => r.data),

  getCategories: () =>
    api.get<string[]>('/products/categories').then(r => r.data),

  getLowStock: () =>
    api.get<Product[]>('/products/low-stock').then(r => r.data),

  create: (data: Partial<Product>) =>
    api.post<Product>('/products', data).then(r => r.data),

  update: (id: number, data: Partial<Product>) =>
    api.patch<Product>(`/products/${id}`, data).then(r => r.data),

  deactivate: (id: number) =>
    api.patch(`/products/${id}/deactivate`).then(r => r.data),
};