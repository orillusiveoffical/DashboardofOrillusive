import { Schema, Document } from 'mongoose';

// ─── Tenant User Schema ────────────────────────────────────────────────────────
export interface ITenantUser extends Document {
  userId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const TenantUserSchema = new Schema<ITenantUser>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, enum: ['OWNER', 'MANAGER', 'STAFF'], default: 'STAFF' },
    phone: String,
    avatarUrl: String,
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

// ─── Room Type Schema ─────────────────────────────────────────────────────────
export interface IRoomType extends Document {
  typeId: string;
  name: string;
  description?: string;
  basePrice: number;
  maxOccupancy: number;
  beds?: string;
  amenities: string[];
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const RoomTypeSchema = new Schema<IRoomType>(
  {
    typeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: String,
    basePrice: { type: Number, required: true },
    maxOccupancy: { type: Number, default: 2 },
    beds: String,
    amenities: [{ type: String }],
    imageUrl: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Room Schema ──────────────────────────────────────────────────────────────
export interface IRoom extends Document {
  roomId: string;
  roomTypeId: string;
  number: string;
  floor?: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE' | 'BLOCKED' | 'OUT_OF_SERVICE';
  notes?: string;
  images: { url: string; caption?: string; isPrimary?: boolean }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const RoomSchema = new Schema<IRoom>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    roomTypeId: { type: String, required: true, index: true },
    number: { type: String, required: true, unique: true, index: true },
    floor: Number,
    status: {
      type: String,
      enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'BLOCKED', 'OUT_OF_SERVICE'],
      default: 'AVAILABLE',
      index: true,
    },
    notes: String,
    images: [
      {
        url: { type: String, required: true },
        caption: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Guest Schema ─────────────────────────────────────────────────────────────
export interface IGuest extends Document {
  guestId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  idType?: string;
  idNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const GuestSchema = new Schema<IGuest>(
  {
    guestId: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, index: true },
    phone: String,
    address: String,
    city: String,
    country: String,
    idType: String,
    idNumber: String,
    notes: String,
  },
  { timestamps: true }
);

// ─── Booking Schema ───────────────────────────────────────────────────────────
export interface IBooking extends Document {
  bookingId: string;
  bookingNumber: string;
  guestId: string;
  roomId: string;
  roomTypeId: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';
  source: 'DIRECT' | 'PHONE' | 'WALK_IN' | 'WEBSITE' | 'OTA';
  externalSource?: string; // Booking.com, Airbnb, Expedia, Agoda
  externalBookingId?: string; // Idempotency key for OTA events
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REFUNDED' | 'FAILED';
  specialRequests?: string;
  notes?: string;
  createdById?: string;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const BookingSchema = new Schema<IBooking>(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    bookingNumber: { type: String, required: true, unique: true, index: true },
    guestId: { type: String, required: true, index: true },
    roomId: { type: String, required: true, index: true },
    roomTypeId: { type: String, required: true, index: true },
    checkIn: { type: Date, required: true, index: true },
    checkOut: { type: Date, required: true, index: true },
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'],
      default: 'CONFIRMED',
      index: true,
    },
    source: {
      type: String,
      enum: ['DIRECT', 'PHONE', 'WALK_IN', 'WEBSITE', 'OTA'],
      default: 'DIRECT',
    },
    externalSource: String,
    externalBookingId: { type: String, index: true },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'COMPLETED', 'REFUNDED', 'FAILED'],
      default: 'PENDING',
    },
    specialRequests: String,
    notes: String,
    createdById: String,
    checkedInAt: Date,
    checkedOutAt: Date,
    cancelledAt: Date,
    cancelReason: String,
  },
  { timestamps: true }
);

// Compound indexes for availability checks & search performance
BookingSchema.index({ roomId: 1, checkIn: 1, checkOut: 1, status: 1 });
BookingSchema.index({ externalBookingId: 1, externalSource: 1 });

// ─── OTA Channel Connection Schema ────────────────────────────────────────────
export interface IChannelConnection extends Document {
  connectionId: string;
  channelId: 'BOOKING_COM' | 'AIRBNB' | 'EXPEDIA' | 'AGODA';
  name: string;
  status: 'CONNECTED' | 'CONNECTING' | 'SYNCING' | 'FAILED' | 'DISCONNECTED';
  propertyId?: string;
  credentials: {
    encryptedText: string;
    iv: string;
    authTag: string;
  };
  lastSyncedAt?: Date;
  lastSyncStatus?: 'SUCCESS' | 'FAILED';
  lastSyncError?: string;
  autoSync: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const ChannelConnectionSchema = new Schema<IChannelConnection>(
  {
    connectionId: { type: String, required: true, unique: true, index: true },
    channelId: {
      type: String,
      enum: ['BOOKING_COM', 'AIRBNB', 'EXPEDIA', 'AGODA'],
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['CONNECTED', 'CONNECTING', 'SYNCING', 'FAILED', 'DISCONNECTED'],
      default: 'CONNECTED',
    },
    propertyId: String,
    credentials: {
      encryptedText: { type: String, required: true },
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
    },
    lastSyncedAt: Date,
    lastSyncStatus: { type: String, enum: ['SUCCESS', 'FAILED'] },
    lastSyncError: String,
    autoSync: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Room Mapping Schema ──────────────────────────────────────────────────────
export interface IRoomMapping extends Document {
  mappingId: string;
  connectionId: string; // References ChannelConnection
  hmsRoomTypeId: string; // References RoomType
  otaRoomTypeId: string;
  otaRoomName: string;
  otaRatePlanId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  createdAt: Date;
  updatedAt: Date;
}

export const RoomMappingSchema = new Schema<IRoomMapping>(
  {
    mappingId: { type: String, required: true, unique: true, index: true },
    connectionId: { type: String, required: true, index: true },
    hmsRoomTypeId: { type: String, required: true, index: true },
    otaRoomTypeId: { type: String, required: true },
    otaRoomName: { type: String, required: true },
    otaRatePlanId: String,
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'ERROR'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

// ─── Tenant Settings Schema ────────────────────────────────────────────────────
export interface ITenantSettings extends Document {
  checkInTime: string;
  checkOutTime: string;
  defaultTaxRate: number;
  cancellationPolicy?: string;
  allowOnlineBooking: boolean;
  bookingConfirmationMsg?: string;
  updatedAt: Date;
}

export const TenantSettingsSchema = new Schema<ITenantSettings>(
  {
    checkInTime: { type: String, default: '14:00' },
    checkOutTime: { type: String, default: '12:00' },
    defaultTaxRate: { type: Number, default: 16 }, // 16% GST default
    cancellationPolicy: { type: String, default: 'Free cancellation up to 48 hours before check-in.' },
    allowOnlineBooking: { type: Boolean, default: true },
    bookingConfirmationMsg: { type: String, default: 'Thank you for choosing our hotel!' },
  },
  { timestamps: true }
);

// ─── Tenant Audit Log Schema ──────────────────────────────────────────────────
export interface ITenantAuditLog extends Document {
  logId: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

export const TenantAuditLogSchema = new Schema<ITenantAuditLog>(
  {
    logId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true },
    userEmail: { type: String, required: true },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    details: Schema.Types.Mixed,
    ipAddress: String,
  },
  { timestamps: true }
);

// ─── Sync Log Schema ──────────────────────────────────────────────────────────
export interface ISyncLog extends Document {
  logId: string;
  channelId: string;
  eventType: 'INVENTORY_PUSH' | 'RESERVATION_PULL' | 'WEBHOOK_EVENT' | 'RETRY_ATTEMPT';
  status: 'SUCCESS' | 'FAILED' | 'RETRYING';
  payloadSummary?: string;
  errorReason?: string;
  retryCount: number;
  createdAt: Date;
}

export const SyncLogSchema = new Schema<ISyncLog>(
  {
    logId: { type: String, required: true, unique: true, index: true },
    channelId: { type: String, required: true, index: true },
    eventType: {
      type: String,
      enum: ['INVENTORY_PUSH', 'RESERVATION_PULL', 'WEBHOOK_EVENT', 'RETRY_ATTEMPT'],
      required: true,
    },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'RETRYING'], required: true },
    payloadSummary: String,
    errorReason: String,
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ─── Housekeeping Schema ──────────────────────────────────────────────────────
export interface IHousekeeping extends Document {
  taskId: string;
  roomId: string;
  roomNumber: string;
  cleaningStatus: 'CLEAN' | 'DIRTY' | 'IN_PROGRESS' | 'INSPECTION';
  assignedTo?: string;
  notes?: string;
  lastCleanedAt?: Date;
  updatedAt: Date;
}

export const HousekeepingSchema = new Schema<IHousekeeping>(
  {
    taskId: { type: String, required: true, unique: true, index: true },
    roomId: { type: String, required: true, index: true },
    roomNumber: { type: String, required: true },
    cleaningStatus: {
      type: String,
      enum: ['CLEAN', 'DIRTY', 'IN_PROGRESS', 'INSPECTION'],
      default: 'CLEAN',
    },
    assignedTo: String,
    notes: String,
    lastCleanedAt: Date,
  },
  { timestamps: true }
);

// ─── Notification Schema ──────────────────────────────────────────────────────
export interface INotification extends Document {
  notificationId: string;
  title: string;
  message: string;
  type: 'BOOKING' | 'CANCELLATION' | 'OTA_SYNC' | 'SUBSCRIPTION' | 'SYSTEM';
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export const NotificationSchema = new Schema<INotification>(
  {
    notificationId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['BOOKING', 'CANCELLATION', 'OTA_SYNC', 'SUBSCRIPTION', 'SYSTEM'],
      default: 'SYSTEM',
    },
    isRead: { type: Boolean, default: false },
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);
