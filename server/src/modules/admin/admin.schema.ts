import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(UserRole).default(UserRole.STAFF),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.nativeEnum(UserRole).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateHotelSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

export const updateSettingsSchema = z.object({
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  allowOnlineBooking: z.boolean().optional(),
  cancellationPolicy: z.string().optional(),
  bookingConfirmationMsg: z.string().optional(),
});
