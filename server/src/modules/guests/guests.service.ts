import prisma from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { paginate } from '../../lib/utils.js';

export async function getGuests(hotelId: string, query: { search?: string; page?: number; limit?: number }) {
  const { skip, take, page, limit } = paginate(query.page, query.limit);
  const where = {
    hotelId,
    ...(query.search && {
      OR: [
        { firstName: { contains: query.search, mode: 'insensitive' as const } },
        { lastName: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
        { phone: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.guest.findMany({
      where,
      skip,
      take,
      include: { _count: { select: { bookings: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.guest.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getGuestById(hotelId: string, id: string) {
  const guest = await prisma.guest.findFirst({
    where: { id, hotelId },
    include: {
      bookings: {
        include: {
          room: { include: { roomType: true } },
          payments: true,
        },
        orderBy: { checkIn: 'desc' },
      },
    },
  });
  if (!guest) throw new AppError('Guest not found', 404);
  return guest;
}

export async function createGuest(hotelId: string, data: Record<string, unknown>) {
  const guestData = { ...data };
  if (guestData.dateOfBirth) {
    const dob = new Date(guestData.dateOfBirth as string);
    guestData.dateOfBirth = isNaN(dob.getTime()) ? null : dob;
  } else {
    delete guestData.dateOfBirth;
  }
  if (guestData.email === '') delete guestData.email;

  return prisma.guest.create({
    data: { hotelId, ...guestData } as never,
  });
}

export async function updateGuest(hotelId: string, id: string, data: Record<string, unknown>) {
  const existing = await prisma.guest.findFirst({ where: { id, hotelId } });
  if (!existing) throw new AppError('Guest not found', 404);

  const guestData = { ...data };
  if (guestData.dateOfBirth) {
    const dob = new Date(guestData.dateOfBirth as string);
    guestData.dateOfBirth = isNaN(dob.getTime()) ? null : dob;
  } else if (guestData.dateOfBirth === '') {
    guestData.dateOfBirth = null;
  }
  if (guestData.email === '') guestData.email = null;

  return prisma.guest.update({ where: { id }, data: guestData as never });
}

export async function deleteGuest(hotelId: string, id: string) {
  const existing = await prisma.guest.findFirst({
    where: { id, hotelId },
    include: { bookings: { where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] } } } },
  });
  if (!existing) throw new AppError('Guest not found', 404);
  if (existing.bookings.length > 0) {
    throw new AppError('Cannot delete guest with active bookings', 400);
  }
  return prisma.guest.delete({ where: { id } });
}
