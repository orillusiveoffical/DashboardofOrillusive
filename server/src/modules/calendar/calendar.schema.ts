import { z } from 'zod';
import { BlockReason } from '@prisma/client';

export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const createBlockSchema = z.object({
  roomId: z.string().cuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.nativeEnum(BlockReason).default(BlockReason.OTHER),
  notes: z.string().optional(),
});

export const updateBlockSchema = createBlockSchema.partial();
