import api from './api';
import { Role, User } from '../types';

export const usersService = {
  getAll: () =>
    api.get<User[]>('/users').then(r => r.data),

  create: (data: { name: string; email: string; password: string; role: Role }) =>
    api.post<User>('/users', data).then(r => r.data),

  update: (id: number, data: Partial<User>) =>
    api.patch<User>(`/users/${id}`, data).then(r => r.data),

  deactivate: (id: number) =>
    api.patch(`/users/${id}/deactivate`).then(r => r.data),
};
