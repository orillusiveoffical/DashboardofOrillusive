import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);

router.get('/stats', async (req, res, next) => {
  try {
    const tenantModels = req.tenantModels!;

    const totalRooms = await tenantModels.Room.countDocuments({ isActive: true });
    const availableRooms = await tenantModels.Room.countDocuments({ status: 'AVAILABLE', isActive: true });
    const occupiedRooms = await tenantModels.Room.countDocuments({ status: 'OCCUPIED', isActive: true });
    const maintenanceRooms = await tenantModels.Room.countDocuments({ status: 'MAINTENANCE', isActive: true });

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const allBookings = await tenantModels.Booking.find().sort({ createdAt: -1 });
    const activeBookings = allBookings.filter((b) => b.status !== 'CANCELLED');
    const totalBookings = allBookings.length;

    const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyBookings = activeBookings.filter((b) => new Date(b.createdAt) >= startOfMonth);
    const monthlyRevenue = monthlyBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayStart = new Date(todayStr);
    const todayEnd = new Date(todayStr);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const upcomingCheckIns = await tenantModels.Booking.find({
      checkIn: { $gte: todayStart, $lt: todayEnd },
      status: { $nin: ['CANCELLED'] },
    }).limit(10);

    const upcomingCheckOuts = await tenantModels.Booking.find({
      checkOut: { $gte: todayStart, $lt: todayEnd },
      status: { $nin: ['CANCELLED'] },
    }).limit(10);

    const otaConnections = await tenantModels.ChannelConnection.find();

    // Fetch guests & rooms for display formatting
    const guests = await tenantModels.Guest.find();
    const guestMap = new Map(guests.map((g) => [g.guestId, g]));

    const rooms = await tenantModels.Room.find();
    const roomMap = new Map(rooms.map((r) => [r.roomId, r]));

    const roomTypes = await tenantModels.RoomType.find();
    const typeMap = new Map(roomTypes.map((rt) => [rt.typeId, rt]));

    const formatBooking = (b: any) => {
      const guestObj = guestMap.get(b.guestId);
      const roomObj = roomMap.get(b.roomId);
      const typeObj = roomObj ? typeMap.get(roomObj.roomTypeId) : null;

      return {
        id: b.bookingId,
        bookingNumber: b.bookingNumber,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        status: b.status,
        totalAmount: b.totalAmount,
        source: b.source,
        guest: guestObj
          ? {
              id: guestObj.guestId,
              firstName: guestObj.firstName,
              lastName: guestObj.lastName,
              email: guestObj.email,
              phone: guestObj.phone,
            }
          : null,
        room: roomObj
          ? {
              id: roomObj.roomId,
              number: roomObj.number,
              roomType: typeObj ? { name: typeObj.name } : null,
            }
          : null,
      };
    };

    res.json({
      success: true,
      data: {
        totalRooms,
        availableRooms,
        occupiedRooms,
        maintenanceRooms,
        occupancyRate,
        totalBookings,
        activeBookings: activeBookings.length,
        totalRevenue,
        monthlyRevenue,
        todayCheckIns: upcomingCheckIns.length,
        todayCheckOuts: upcomingCheckOuts.length,
        recentBookings: allBookings.slice(0, 5).map(formatBooking),
        upcomingCheckIns: upcomingCheckIns.map(formatBooking),
        upcomingCheckOuts: upcomingCheckOuts.map(formatBooking),
        otaConnectionsCount: otaConnections.length,
        otaActiveCount: otaConnections.filter((c) => c.status === 'CONNECTED').length,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
