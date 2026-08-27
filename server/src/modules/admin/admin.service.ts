import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import prisma from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { omitPassword, paginate } from '../../lib/utils.js';

export async function getUsers(hotelId: string) {
  const users = await prisma.user.findMany({
    where: { hotelId },
    orderBy: { createdAt: 'desc' },
  });
  return users.map(omitPassword);
}

export async function createUser(hotelId: string, data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  phone?: string;
}) {
  const existing = await prisma.user.findFirst({
    where: { hotelId, email: data.email },
  });
  if (existing) throw new AppError('Email already exists for this hotel', 409);

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { hotelId, ...data, passwordHash },
  });
  return omitPassword(user);
}

export async function updateUser(
  hotelId: string,
  id: string,
  data: Record<string, unknown>,
  requesterId: string,
  requesterRole: UserRole
) {
  const existing = await prisma.user.findFirst({ where: { id, hotelId } });
  if (!existing) throw new AppError('User not found', 404);

  if (existing.role === UserRole.OWNER && requesterRole !== UserRole.OWNER) {
    throw new AppError('Only owners can modify owner accounts', 403);
  }

  if (id === requesterId && data.isActive === false) {
    throw new AppError('Cannot deactivate your own account', 400);
  }

  const updateData: Record<string, unknown> = { ...data };
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password as string, 12);
    delete updateData.password;
  }

  const user = await prisma.user.update({ where: { id }, data: updateData });
  return omitPassword(user);
}

export async function deleteUser(hotelId: string, id: string, requesterId: string) {
  if (id === requesterId) throw new AppError('Cannot delete your own account', 400);

  const existing = await prisma.user.findFirst({ where: { id, hotelId } });
  if (!existing) throw new AppError('User not found', 404);
  if (existing.role === UserRole.OWNER) {
    const ownerCount = await prisma.user.count({
      where: { hotelId, role: UserRole.OWNER, isActive: true },
    });
    if (ownerCount <= 1) throw new AppError('Cannot delete the last owner', 400);
  }

  return prisma.user.update({ where: { id }, data: { isActive: false } });
}

export async function getHotel(hotelId: string) {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    include: { settings: true },
  });
  if (!hotel) throw new AppError('Hotel not found', 404);
  return hotel;
}

export async function updateHotel(hotelId: string, data: Record<string, unknown>) {
  return prisma.hotel.update({
    where: { id: hotelId },
    data,
    include: { settings: true },
  });
}

export async function updateSettings(hotelId: string, data: Record<string, unknown>) {
  return prisma.hotelSettings.upsert({
    where: { hotelId },
    update: data,
    create: { hotelId, ...data },
  });
}
