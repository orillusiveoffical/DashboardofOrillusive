import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  hotelId: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  occupancyRate: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  recentBookings: unknown[];
  upcomingCheckIns: unknown[];
  upcomingCheckOuts: unknown[];
}

export interface CalendarCell {
  date: string;
  roomId: string;
  roomNumber: string;
  status: 'available' | 'booked' | 'blocked' | 'maintenance';
  bookingId?: string;
  guestName?: string;
  blockId?: string;
}

export interface AvailabilityCheck {
  available: boolean;
  conflicts: {
    type: 'booking' | 'block' | 'maintenance';
    id: string;
    message: string;
  }[];
}
