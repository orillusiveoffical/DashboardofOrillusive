import { api } from '@/lib/api';

export interface HousekeepingTask {
  roomId: string;
  roomNumber: string;
  floor?: number;
  roomStatus: string;
  cleaningStatus: 'CLEAN' | 'DIRTY' | 'IN_PROGRESS' | 'INSPECTION';
  assignedTo?: string;
  notes?: string;
  lastCleanedAt?: string;
}

export const housekeepingService = {
  getAll: () => api<HousekeepingTask[]>('/housekeeping'),

  updateStatus: (roomId: string, data: { cleaningStatus: string; assignedTo?: string; notes?: string }) =>
    api<HousekeepingTask>(`/housekeeping/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
