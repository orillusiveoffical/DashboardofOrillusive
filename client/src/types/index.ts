export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF';

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW';

export type BookingSource = 'DIRECT' | 'PHONE' | 'WALK_IN' | 'OTA';

export type BlockReason = 'MAINTENANCE' | 'RENOVATION' | 'OWNER_USE' | 'OTHER';

export interface Hotel {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone?: string;
}

export interface User {
  id: string;
  hotelId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  hotel: Hotel;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: { field: string; message: string }[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RoomType {
  id: string;
  name: string;
  description?: string;
  basePrice: number | string;
  maxOccupancy: number;
  amenities: string[];
  imageUrl?: string;
  isActive: boolean;
  _count?: { rooms: number };
}

export interface RoomImage {
  id: string;
  url: string;
  caption?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Room {
  id: string;
  number: string;
  floor?: number;
  status: RoomStatus;
  notes?: string;
  roomTypeId: string;
  roomType: RoomType;
  images: RoomImage[];
  _count?: { bookings: number };
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  dateOfBirth?: string;
  _count?: { bookings: number };
  bookings?: Booking[];
}

export interface Booking {
  id: string;
  bookingNumber: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status: BookingStatus;
  source: BookingSource;
  totalAmount: number | string;
  paidAmount: number | string;
  specialRequests?: string;
  internalNotes?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  roomId: string;
  guestId: string;
  room?: Room;
  guest?: Guest;
  payments?: Payment[];
  createdBy?: { id: string; firstName: string; lastName: string };
}

export interface Payment {
  id: string;
  amount: number | string;
  method: string;
  status: string;
  reference?: string;
  paidAt?: string;
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
  recentBookings: Booking[];
  upcomingCheckIns: Booking[];
  upcomingCheckOuts: Booking[];
}

export interface CalendarGrid {
  year: number;
  month: number;
  days: string[];
  rooms: { id: string; number: string; floor?: number; status: RoomStatus; roomType: { name: string; basePrice: number | string } }[];
  grid: CalendarCell[];
  bookings: { id: string; roomId: string; bookingNumber: string; checkIn: string; checkOut: string; status: BookingStatus; guestName: string }[];
  blocks: { id: string; roomId: string; startDate: string; endDate: string; reason: BlockReason; notes?: string }[];
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

export interface RoomBlock {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  reason: BlockReason;
  notes?: string;
  room?: { number: string; roomType: { name: string } };
}

export interface HotelSettings {
  id: string;
  checkInTime: string;
  checkOutTime: string;
  defaultTaxRate: number | string;
  allowOnlineBooking: boolean;
  cancellationPolicy?: string;
  bookingConfirmationMsg?: string;
}

export interface HotelDetails extends Hotel {
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  settings?: HotelSettings;
}

export interface AvailabilityCheck {
  available: boolean;
  conflicts: { type: string; id: string; message: string }[];
}
