import api from './api';

export const activityService = {
  getAll: (params?: {
    userId?:   number;
    entity?:   string;
    dateFrom?: string;
    dateTo?:   string;
    page?:     number;
  }) => api.get('/activity', { params }).then(r => r.data),

  getByUser: (id: number) =>
    api.get(`/activity/user/${id}`).then(r => r.data),

  getStats: () =>
    api.get('/activity/stats').then(r => r.data),
};