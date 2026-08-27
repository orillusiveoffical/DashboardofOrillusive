import { api } from '@/lib/api';
import type { DashboardStats } from '@/types';

export const dashboardService = {
  getStats: () => api<DashboardStats>('/dashboard/stats'),
};
