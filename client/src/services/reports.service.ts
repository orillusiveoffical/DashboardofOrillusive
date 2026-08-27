import { api } from '@/lib/api';

export interface ReportsAnalytics {
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  totalBookings: number;
  activeBookingsCount: number;
  cancelledBookingsCount: number;
  totalRevenuePkr: number;
  channelPerformance: {
    channel: string;
    bookingsCount: number;
    revenuePkr: number;
  }[];
  currency: string;
}

export const reportsService = {
  getAnalytics: () => api<ReportsAnalytics>('/reports/analytics'),
};
