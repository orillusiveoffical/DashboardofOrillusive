import { BookingStatus, RoomStatus, BlockReason } from '@prisma/client';
import prisma from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { parseDateOnly } from '../../lib/utils.js';
import type { CalendarCell } from '../../types/index.js';

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(Date.UTC(year, month - 1, 1));

  while (date.getUTCMonth() === month - 1) {
    days.push(new Date(date));
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return days;
}

export async function getCalendarGrid(
  hotelId: string,
  year: number,
  month: number
) {
  const days = getDaysInMonth(year, month);

  const startDate = days[0];
  const endDate = new Date(days[days.length - 1]);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  const rooms = await prisma.room.findMany({
    where: { hotelId },
    include: {
      roomType: { select: { name: true, basePrice: true } },
    },
    orderBy: [{ floor: 'asc' }, { number: 'asc' }],
  });

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        hotelId,
        status: { in: ACTIVE_STATUSES },
        checkIn: { lt: endDate },
        checkOut: { gt: startDate },
      },
      include: {
        guest: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.roomBlock.findMany({
      where: {
        hotelId,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    }),
  ]);

  const grid: CalendarCell[] = [];

  for (const room of rooms) {
    for (const day of days) {
      const dateStr = formatDate(day);
      const dayTime = day.getTime();

      let cell: CalendarCell = {
        date: dateStr,
        roomId: room.id,
        roomNumber: room.number,
        status:
          room.status === RoomStatus.MAINTENANCE
            ? 'maintenance'
            : 'available',
      };

      const dayBooking = bookings.find((b) => {
        const checkInTime = new Date(b.checkIn).getTime();
        const checkOutTime = new Date(b.checkOut).getTime();
        return (
          b.roomId === room.id &&
          checkInTime <= dayTime &&
          checkOutTime > dayTime
        );
      });

      if (dayBooking) {
        cell = {
          ...cell,
          status: 'booked',
          bookingId: dayBooking.id,
          guestName: `${dayBooking.guest.firstName} ${dayBooking.guest.lastName}`,
        };
      } else {
        const dayBlock = blocks.find((bl) => {
          const startTime = new Date(bl.startDate).getTime();
          const endTime = new Date(bl.endDate).getTime();
          return (
            bl.roomId === room.id &&
            startTime <= dayTime &&
            endTime > dayTime
          );
        });

        if (dayBlock) {
          cell = {
            ...cell,
            status: 'blocked',
            blockId: dayBlock.id,
          };
        }
      }

      grid.push(cell);
    }
  }

  return {
    year,
    month,
    days: days.map(formatDate),
    rooms: rooms.map((r) => ({
      id: r.id,
      number: r.number,
      floor: r.floor,
      status: r.status,
      roomType: r.roomType,
    })),
    grid,
    bookings: bookings.map((b) => ({
      id: b.id,
      roomId: b.roomId,
      bookingNumber: b.bookingNumber,
      checkIn: formatDate(b.checkIn),
      checkOut: formatDate(b.checkOut),
      status: b.status,
      guestName: `${b.guest.firstName} ${b.guest.lastName}`,
    })),
    blocks: blocks.map((bl) => ({
      id: bl.id,
      roomId: bl.roomId,
      startDate: formatDate(bl.startDate),
      endDate: formatDate(bl.endDate),
      reason: bl.reason,
      notes: bl.notes,
    })),
  };
}

export interface CreateRoomBlockInput {
  roomId: string;
  startDate: string;
  endDate: string;
  reason?: BlockReason;
  notes?: string;
}

export async function createRoomBlock(hotelId: string, data: CreateRoomBlockInput) {
  const start = parseDateOnly(data.startDate);
  const end = parseDateOnly(data.endDate);

  if (start >= end) {
    throw new AppError('End date must be after start date', 400);
  }

  const room = await prisma.room.findFirst({
    where: { id: data.roomId, hotelId },
  });

  if (!room) throw new AppError('Room not found', 404);

  return prisma.roomBlock.create({
    data: {
      hotelId,
      roomId: data.roomId,
      startDate: start,
      endDate: end,
      reason: data.reason ?? BlockReason.OTHER,
      notes: data.notes,
    },
  });
}

export async function getRoomBlocks(hotelId: string) {
  return prisma.roomBlock.findMany({
    where: { hotelId },
    include: {
      room: {
        select: { number: true, roomType: { select: { name: true } } },
      },
    },
    orderBy: { startDate: 'desc' },
  });
}

export async function deleteRoomBlock(hotelId: string, id: string) {
  const block = await prisma.roomBlock.findFirst({
    where: { id, hotelId },
  });

  if (!block) throw new AppError('Room block not found', 404);

  return prisma.roomBlock.delete({ where: { id } });
}
