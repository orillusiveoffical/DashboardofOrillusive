import { api } from '@/lib/api';
import type { CalendarGrid, RoomBlock } from '@/types';

export const calendarService = {
  getGrid: (year: number, month: number) =>
    api<CalendarGrid>(`/calendar?year=${year}&month=${month}`),

  getBlocks: () => api<RoomBlock[]>('/calendar/blocks'),

  createBlock: (data: {
    roomId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    notes?: string;
  }) =>
    api<RoomBlock>('/calendar/blocks', { method: 'POST', body: JSON.stringify(data) }),

  deleteBlock: (id: string) =>
    api<void>(`/calendar/blocks/${id}`, { method: 'DELETE' }),
};
