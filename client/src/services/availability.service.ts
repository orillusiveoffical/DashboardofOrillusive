import { api } from '@/lib/api';

export interface RoomAvailability {
  roomId: string;
  roomNumber: string;
  status: string;
  bookings: {
    bookingId: string;
    bookingNumber: string;
    checkIn: string;
    checkOut: string;
    status: string;
  }[];
}

export const availabilityService = {
  getOverview: () => api<RoomAvailability[]>('/availability'),

  blockRoom: (roomId: string, notes?: string, status: string = 'BLOCKED') =>
    api<{ success: boolean }>(`/availability/block`, {
      method: 'POST',
      body: JSON.stringify({ roomId, notes, status }),
    }),

  unblockRoom: (roomId: string) =>
    api<{ success: boolean }>(`/availability/unblock`, {
      method: 'POST',
      body: JSON.stringify({ roomId }),
    }),
};
