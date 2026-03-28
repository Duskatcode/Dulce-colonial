import api from './api';
import { Ingredient, PaginatedResponse } from '../types';

export interface IngredientFilters {
  search?: string;
  unit?: string;
  belowMinStock?: boolean;
  page?: number;
  limit?: number;
}

export const inventoryService = {
  getAll: (filters: IngredientFilters = {}) =>
    api.get<PaginatedResponse<Ingredient>>('/inventory', { params: filters }).then(r => r.data),

  getOne: (id: number) =>
    api.get<Ingredient>(`/inventory/${id}`).then(r => r.data),

  getUnits: () =>
    api.get<string[]>('/inventory/units').then(r => r.data),

  getLowStock: () =>
    api.get<Ingredient[]>('/inventory/low-stock').then(r => r.data),

  create: (data: Partial<Ingredient>) =>
    api.post<Ingredient>('/inventory', data).then(r => r.data),

  update: (id: number, data: Partial<Ingredient>) =>
    api.patch<Ingredient>(`/inventory/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/inventory/${id}`).then(r => r.data),
};