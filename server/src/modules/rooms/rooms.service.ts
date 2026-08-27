import { RoomStatus } from '@prisma/client';
import prisma from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { paginate } from '../../lib/utils.js';

export async function getRoomTypes(hotelId: string) {
  return prisma.roomType.findMany({
    where: { hotelId, isActive: true },
    include: { _count: { select: { rooms: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createRoomType(hotelId: string, data: {
  name: string;
  description?: string;
  basePrice: number;
  maxOccupancy?: number;
  amenities?: string[];
  imageUrl?: string;
}) {
  return prisma.roomType.create({
    data: { hotelId, ...data, imageUrl: data.imageUrl || undefined },
  });
}

export async function updateRoomType(hotelId: string, id: string, data: Record<string, unknown>) {
  const existing = await prisma.roomType.findFirst({ where: { id, hotelId } });
  if (!existing) throw new AppError('Room type not found', 404);
  return prisma.roomType.update({ where: { id }, data });
}

export async function deleteRoomType(hotelId: string, id: string) {
  const existing = await prisma.roomType.findFirst({
    where: { id, hotelId },
    include: { _count: { select: { rooms: true } } },
  });
  if (!existing) throw new AppError('Room type not found', 404);
  if (existing._count.rooms > 0) {
    throw new AppError('Cannot delete room type with assigned rooms', 400);
  }
  return prisma.roomType.update({ where: { id }, data: { isActive: false } });
}

export async function getRooms(hotelId: string, query: {
  status?: RoomStatus;
  roomTypeId?: string;
  page?: number;
  limit?: number;
}) {
  const { skip, take, page, limit } = paginate(query.page, query.limit);
  const where = {
    hotelId,
    ...(query.status && { status: query.status }),
    ...(query.roomTypeId && { roomTypeId: query.roomTypeId }),
  };

  const [items, total] = await Promise.all([
    prisma.room.findMany({
      where,
      skip,
      take,
      include: {
        roomType: true,
        images: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { bookings: true } },
      },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    }),
    prisma.room.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getRoomById(hotelId: string, id: string) {
  const room = await prisma.room.findFirst({
    where: { id, hotelId },
    include: {
      roomType: true,
      images: { orderBy: { sortOrder: 'asc' } },
      bookings: {
        where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] } },
        include: { guest: true },
        orderBy: { checkIn: 'asc' },
        take: 5,
      },
    },
  });
  if (!room) throw new AppError('Room not found', 404);
  return room;
}

export async function createRoom(hotelId: string, data: {
  roomTypeId: string;
  number: string;
  floor?: number;
  status?: RoomStatus;
  notes?: string;
}) {
  const roomType = await prisma.roomType.findFirst({
    where: { id: data.roomTypeId, hotelId },
  });
  if (!roomType) throw new AppError('Room type not found', 404);

  const existing = await prisma.room.findFirst({
    where: { hotelId, number: data.number },
  });
  if (existing) throw new AppError('Room number already exists', 409);

  return prisma.room.create({
    data: { hotelId, ...data },
    include: { roomType: true, images: true },
  });
}

export async function updateRoom(hotelId: string, id: string, data: Record<string, unknown>) {
  const existing = await prisma.room.findFirst({ where: { id, hotelId } });
  if (!existing) throw new AppError('Room not found', 404);

  if (data.number && data.number !== existing.number) {
    const dup = await prisma.room.findFirst({
      where: { hotelId, number: data.number as string, id: { not: id } },
    });
    if (dup) throw new AppError('Room number already exists', 409);
  }

  return prisma.room.update({
    where: { id },
    data,
    include: { roomType: true, images: true },
  });
}

export async function deleteRoom(hotelId: string, id: string) {
  const existing = await prisma.room.findFirst({
    where: { id, hotelId },
    include: {
      bookings: {
        where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] } },
      },
    },
  });
  if (!existing) throw new AppError('Room not found', 404);
  if (existing.bookings.length > 0) {
    throw new AppError('Cannot delete room with active bookings', 400);
  }
  return prisma.room.delete({ where: { id } });
}

export async function addRoomImage(hotelId: string, roomId: string, data: {
  url: string;
  caption?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}) {
  const room = await prisma.room.findFirst({ where: { id: roomId, hotelId } });
  if (!room) throw new AppError('Room not found', 404);

  if (data.isPrimary) {
    await prisma.roomImage.updateMany({
      where: { roomId },
      data: { isPrimary: false },
    });
  }

  return prisma.roomImage.create({ data: { roomId, ...data } });
}

export async function deleteRoomImage(hotelId: string, roomId: string, imageId: string) {
  const room = await prisma.room.findFirst({ where: { id: roomId, hotelId } });
  if (!room) throw new AppError('Room not found', 404);
  return prisma.roomImage.delete({ where: { id: imageId, roomId } });
}
