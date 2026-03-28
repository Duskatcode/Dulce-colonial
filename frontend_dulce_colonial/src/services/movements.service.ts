import api from './api';
import { Movement, PaginatedResponse, MovementType, ReferenceType } from '../types';

export interface MovementFilters {
  type?: MovementType;
  referenceType?: ReferenceType;
  referenceId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CreateMovementData {
  type: MovementType;
  referenceType: ReferenceType;
  referenceId: number;
  quantity: number;
  reason?: string;
  notes?: string;
}

export const movementsService = {
  getAll: (filters: MovementFilters = {}) =>
    api.get<PaginatedResponse<Movement>>('/movements', { params: filters }).then(r => r.data),

  getOne: (id: number) =>
    api.get<Movement>(`/movements/${id}`).then(r => r.data),

  getSummary: (dateFrom?: string, dateTo?: string) =>
    api.get('/movements/summary', { params: { dateFrom, dateTo } }).then(r => r.data),

  create: (data: CreateMovementData) =>
    api.post<Movement>('/movements', data).then(r => r.data),
};