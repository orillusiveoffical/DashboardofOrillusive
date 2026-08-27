import { api } from '@/lib/api';
import type { PaginatedResult, Room, RoomType, RoomImage } from '@/types';

export const roomsService = {
  getTypes: () => api<RoomType[]>('/rooms/types'),
  getRoomTypes: () => api<RoomType[]>('/rooms/types'),

  createType: (data: Partial<RoomType>) =>
    api<RoomType>('/rooms/types', { method: 'POST', body: JSON.stringify(data) }),

  updateType: (id: string, data: Partial<RoomType>) =>
    api<RoomType>(`/rooms/types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteType: (id: string) =>
    api<void>(`/rooms/types/${id}`, { method: 'DELETE' }),

  getAll: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResult<Room>>(`/rooms${query}`);
  },

  getById: (id: string) => api<Room>(`/rooms/${id}`),

  create: (data: Partial<Room>) =>
    api<Room>('/rooms', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Room>) =>
    api<Room>(`/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    api<void>(`/rooms/${id}`, { method: 'DELETE' }),

  addImage: (roomId: string, data: Partial<RoomImage>) =>
    api<RoomImage>(`/rooms/${roomId}/images`, { method: 'POST', body: JSON.stringify(data) }),

  deleteImage: (roomId: string, imageId: string) =>
    api<void>(`/rooms/${roomId}/images/${imageId}`, { method: 'DELETE' }),
};
