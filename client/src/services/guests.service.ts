import { api } from '@/lib/api';
import type { Guest, PaginatedResult } from '@/types';

export const guestsService = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResult<Guest>>(`/guests${query}`);
  },

  getById: (id: string) => api<Guest>(`/guests/${id}`),

  create: (data: Partial<Guest>) =>
    api<Guest>('/guests', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Guest>) =>
    api<Guest>(`/guests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    api<void>(`/guests/${id}`, { method: 'DELETE' }),
};
