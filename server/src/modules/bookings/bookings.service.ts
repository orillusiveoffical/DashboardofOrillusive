import { BookingStatus, RoomStatus } from '@prisma/client';
import prisma from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { generateBookingNumber, parseDateOnly, datesOverlap, paginate } from '../../lib/utils.js';
import type { AvailabilityCheck } from '../../types/index.js';

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
];

export async function checkAvailability(
  hotelId: string,
  roomId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string
): Promise<AvailabilityCheck> {
  const start = parseDateOnly(checkIn);
  const end = parseDateOnly(checkOut);

  if (start >= end) {
    throw new AppError('Check-out must be after check-in', 400);
  }

  const conflicts: AvailabilityCheck['conflicts'] = [];

  const room = await prisma.room.findFirst({ where: { id: roomId, hotelId } });
  if (!room) throw new AppError('Room not found', 404);

  if (room.status === RoomStatus.MAINTENANCE) {
    conflicts.push({ type: 'maintenance', id: room.id, message: 'Room is under maintenance' });
  }

  const overlappingBookings = await prisma.booking.findMany({
    where: {
      roomId,
      hotelId,
      status: { in: ACTIVE_STATUSES },
      ...(excludeBookingId && { NOT: { id: excludeBookingId } }),
      checkIn: { lt: end },
      checkOut: { gt: start },
    },
  });

  for (const b of overlappingBookings) {
    conflicts.push({
      type: 'booking',
      id: b.id,
      message: `Conflicts with booking ${b.bookingNumber}`,
    });
  }

  const overlappingBlocks = await prisma.roomBlock.findMany({
    where: {
      roomId,
      hotelId,
      startDate: { lt: end },
      endDate: { gt: start },
    },
  });

  for (const block of overlappingBlocks) {
    conflicts.push({
      type: 'block',
      id: block.id,
      message: `Room blocked: ${block.reason}`,
    });
  }

  return { available: conflicts.length === 0, conflicts };
}

export async function getBookings(hotelId: string, query: {
  status?: BookingStatus;
  roomId?: string;
  guestId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  const { skip, take, page, limit } = paginate(query.page, query.limit);
  const where = {
    hotelId,
    ...(query.status && { status: query.status }),
    ...(query.roomId && { roomId: query.roomId }),
    ...(query.guestId && { guestId: query.guestId }),
    ...(query.from && query.from.trim() !== '' && { checkOut: { gte: parseDateOnly(query.from) } }),
    ...(query.to && query.to.trim() !== '' && { checkIn: { lte: parseDateOnly(query.to) } }),
  };

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take,
      include: {
        room: { include: { roomType: true } },
        guest: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getBookingById(hotelId: string, id: string) {
  const booking = await prisma.booking.findFirst({
    where: { id, hotelId },
    include: {
      room: { include: { roomType: true, images: true } },
      guest: true,
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      checkedInBy: { select: { id: true, firstName: true, lastName: true } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!booking) throw new AppError('Booking not found', 404);
  return booking;
}

export async function createBooking(
  hotelId: string,
  userId: string,
  data: {
    roomId: string;
    guestId: string;
    checkIn: string;
    checkOut: string;
    adults?: number;
    children?: number;
    status?: BookingStatus;
    source?: string;
    totalAmount: number;
    paidAmount?: number;
    specialRequests?: string;
    internalNotes?: string;
  }
) {
  const availability = await checkAvailability(hotelId, data.roomId, data.checkIn, data.checkOut);
  if (!availability.available) {
    throw new AppError(
      `Room not available: ${availability.conflicts.map((c) => c.message).join(', ')}`,
      409
    );
  }

  const guest = await prisma.guest.findFirst({ where: { id: data.guestId, hotelId } });
  if (!guest) throw new AppError('Guest not found', 404);

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        hotelId,
        roomId: data.roomId,
        guestId: data.guestId,
        createdById: userId,
        bookingNumber: generateBookingNumber(),
        checkIn: parseDateOnly(data.checkIn),
        checkOut: parseDateOnly(data.checkOut),
        adults: data.adults ?? 1,
        children: data.children ?? 0,
        status: data.status ?? BookingStatus.CONFIRMED,
        source: data.source as never,
        totalAmount: data.totalAmount,
        paidAmount: data.paidAmount ?? 0,
        specialRequests: data.specialRequests,
        internalNotes: data.internalNotes,
      },
      include: {
        room: { include: { roomType: true } },
        guest: true,
      },
    });

    if (created.status === BookingStatus.CHECKED_IN) {
      await tx.room.update({
        where: { id: data.roomId },
        data: { status: RoomStatus.OCCUPIED },
      });
    }

    return created;
  });

  return booking;
}

export async function updateBooking(
  hotelId: string,
  id: string,
  data: Record<string, unknown>
) {
  const existing = await prisma.booking.findFirst({ where: { id, hotelId } });
  if (!existing) throw new AppError('Booking not found', 404);

  if (existing.status === BookingStatus.CANCELLED || existing.status === BookingStatus.CHECKED_OUT) {
    throw new AppError('Cannot modify cancelled or checked-out booking', 400);
  }

  const checkIn = (data.checkIn as string) || existing.checkIn.toISOString().slice(0, 10);
  const checkOut = (data.checkOut as string) || existing.checkOut.toISOString().slice(0, 10);
  const roomId = (data.roomId as string) || existing.roomId;

  if (data.checkIn || data.checkOut || data.roomId) {
    const availability = await checkAvailability(hotelId, roomId, checkIn, checkOut, id);
    if (!availability.available) {
      throw new AppError(
        `Room not available: ${availability.conflicts.map((c) => c.message).join(', ')}`,
        409
      );
    }
  }

  const updateData: Record<string, unknown> = { ...data };
  if (data.checkIn) updateData.checkIn = parseDateOnly(data.checkIn as string);
  if (data.checkOut) updateData.checkOut = parseDateOnly(data.checkOut as string);

  return prisma.booking.update({
    where: { id },
    data: updateData,
    include: { room: { include: { roomType: true } }, guest: true, payments: true },
  });
}

export async function cancelBooking(hotelId: string, id: string, reason?: string) {
  const existing = await prisma.booking.findFirst({ where: { id, hotelId } });
  if (!existing) throw new AppError('Booking not found', 404);

  if (existing.status === BookingStatus.CHECKED_OUT) {
    throw new AppError('Cannot cancel checked-out booking', 400);
  }

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: { room: true, guest: true },
    });

    if (existing.status === BookingStatus.CHECKED_IN) {
      await tx.room.update({
        where: { id: existing.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });
    }

    return booking;
  });
}

export async function checkInBooking(hotelId: string, id: string, userId: string) {
  const existing = await prisma.booking.findFirst({ where: { id, hotelId } });
  if (!existing) throw new AppError('Booking not found', 404);

  if (existing.status !== BookingStatus.CONFIRMED && existing.status !== BookingStatus.PENDING) {
    throw new AppError('Only confirmed or pending bookings can be checked in', 400);
  }

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CHECKED_IN,
        checkedInAt: new Date(),
        checkedInById: userId,
      },
      include: { room: { include: { roomType: true } }, guest: true },
    });

    await tx.room.update({
      where: { id: existing.roomId },
      data: { status: RoomStatus.OCCUPIED },
    });

    return booking;
  });
}

export async function checkOutBooking(hotelId: string, id: string) {
  const existing = await prisma.booking.findFirst({ where: { id, hotelId } });
  if (!existing) throw new AppError('Booking not found', 404);

  if (existing.status !== BookingStatus.CHECKED_IN) {
    throw new AppError('Only checked-in bookings can be checked out', 400);
  }

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CHECKED_OUT,
        checkedOutAt: new Date(),
      },
      include: { room: { include: { roomType: true } }, guest: true },
    });

    await tx.room.update({
      where: { id: existing.roomId },
      data: { status: RoomStatus.AVAILABLE },
    });

    return booking;
  });
}
