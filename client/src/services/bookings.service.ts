import { api } from '@/lib/api';
import type { AvailabilityCheck, Booking, PaginatedResult } from '@/types';

export const bookingsService = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResult<Booking>>(`/bookings${query}`);
  },

  getById: (id: string) => api<Booking>(`/bookings/${id}`),

  create: (data: Record<string, unknown>) =>
    api<Booking>('/bookings', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    api<Booking>(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  cancel: (id: string, reason?: string) =>
    api<Booking>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  delete: (id: string) =>
    api<Booking>(`/bookings/${id}`, {
      method: 'DELETE',
    }),

  checkIn: (id: string) =>
    api<Booking>(`/bookings/${id}/check-in`, { method: 'POST' }),

  checkOut: (id: string) =>
    api<Booking>(`/bookings/${id}/check-out`, { method: 'POST' }),

  checkAvailability: (data: {
    roomId: string;
    checkIn: string;
    checkOut: string;
    excludeBookingId?: string;
  }) =>
    api<AvailabilityCheck>('/bookings/check-availability', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
