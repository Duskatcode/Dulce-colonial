import api from './api';
import { Movement, PaginatedResponse, MovementType, ReferenceType } from '../types';

export interface MovementFilters {
  type?: MovementType;
  entityType?: ReferenceType;
  entityId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateMovementData {
  type: MovementType;
  entityType: ReferenceType;
  entityId: number;
  quantity: number;
  notes?: string;
}

export const movementsService = {
  getAll: (filters: MovementFilters = {}) =>
    api.get<PaginatedResponse<Movement>>('/movements', { params: filters }).then(r => r.data),

  getSummary: (startDate?: string, endDate?: string) =>
    api.get('/movements/summary', { params: { startDate, endDate } }).then(r => r.data),

  create: (data: CreateMovementData) =>
    api.post<Movement>('/movements', data).then(r => r.data),
};
