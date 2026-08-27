import { z } from 'zod';
import { RoomStatus } from '@prisma/client';

export const createRoomTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  maxOccupancy: z.number().int().min(1).default(2),
  amenities: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export const updateRoomTypeSchema = createRoomTypeSchema.partial();

export const createRoomSchema = z.object({
  roomTypeId: z.string().cuid(),
  number: z.string().min(1),
  floor: z.number().int().optional(),
  status: z.nativeEnum(RoomStatus).default(RoomStatus.AVAILABLE),
  notes: z.string().optional(),
});

export const updateRoomSchema = createRoomSchema.partial();

export const roomImageSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const roomQuerySchema = z.object({
  status: z.nativeEnum(RoomStatus).optional(),
  roomTypeId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
