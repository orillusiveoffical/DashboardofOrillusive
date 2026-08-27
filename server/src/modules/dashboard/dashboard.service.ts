import { BookingStatus, RoomStatus, PaymentStatus } from '@prisma/client';
import prisma from '../../lib/prisma.js';
import type { DashboardStats } from '../../types/index.js';

export async function getDashboardStats(hotelId: string): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [
    totalBookings,
    activeBookings,
    rooms,
    revenueAgg,
    monthlyRevenueAgg,
    recentBookings,
    upcomingCheckIns,
    upcomingCheckOuts,
  ] = await Promise.all([
    prisma.booking.count({ where: { hotelId } }),
    prisma.booking.count({
      where: { hotelId, status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] } },
    }),
    prisma.room.findMany({ where: { hotelId }, select: { status: true } }),
    prisma.payment.aggregate({
      where: { hotelId, status: PaymentStatus.COMPLETED },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        hotelId,
        status: PaymentStatus.COMPLETED,
        paidAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.booking.findMany({
      where: { hotelId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        guest: { select: { firstName: true, lastName: true } },
        room: { select: { number: true, roomType: { select: { name: true } } } },
      },
    }),
    prisma.booking.findMany({
      where: {
        hotelId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
        checkIn: { gte: today, lt: tomorrow },
      },
      include: {
        guest: { select: { firstName: true, lastName: true, phone: true } },
        room: { select: { number: true } },
      },
      orderBy: { checkIn: 'asc' },
    }),
    prisma.booking.findMany({
      where: {
        hotelId,
        status: BookingStatus.CHECKED_IN,
        checkOut: { gte: today, lt: tomorrow },
      },
      include: {
        guest: { select: { firstName: true, lastName: true, phone: true } },
        room: { select: { number: true } },
      },
      orderBy: { checkOut: 'asc' },
    }),
  ]);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === RoomStatus.OCCUPIED).length;
  const availableRooms = rooms.filter((r) => r.status === RoomStatus.AVAILABLE).length;
  const maintenanceRooms = rooms.filter((r) => r.status === RoomStatus.MAINTENANCE).length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  return {
    totalBookings,
    activeBookings,
    occupancyRate,
    totalRevenue: Number(revenueAgg._sum.amount ?? 0),
    monthlyRevenue: Number(monthlyRevenueAgg._sum.amount ?? 0),
    totalRooms,
    occupiedRooms,
    availableRooms,
    maintenanceRooms,
    recentBookings,
    upcomingCheckIns,
    upcomingCheckOuts,
  };
}
