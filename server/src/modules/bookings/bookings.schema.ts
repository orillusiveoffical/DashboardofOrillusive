import { z } from 'zod';
import { BookingStatus, BookingSource } from '@prisma/client';

export const createBookingSchema = z.object({
  roomId: z.string().cuid(),
  guestId: z.string().cuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  status: z.nativeEnum(BookingStatus).default(BookingStatus.CONFIRMED),
  source: z.nativeEnum(BookingSource).default(BookingSource.DIRECT),
  totalAmount: z.number().positive(),
  paidAmount: z.number().min(0).default(0),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const updateBookingSchema = createBookingSchema.partial().extend({
  cancelReason: z.string().optional(),
});

export const bookingQuerySchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  roomId: z.string().cuid().optional(),
  guestId: z.string().cuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const checkAvailabilitySchema = z.object({
  roomId: z.string().cuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  excludeBookingId: z.string().cuid().optional(),
});
