import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);

router.get('/', async (req, res, next) => {
  try {
    const { year, month, startDate, endDate } = req.query;

    let start: Date;
    let end: Date;

    if (year && month) {
      const y = Number(year);
      const m = Number(month) - 1;
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59);
    } else if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const rooms = await req.tenantModels!.Room.find({ isActive: true }).sort({ number: 1 });
    const roomTypes = await req.tenantModels!.RoomType.find({ isActive: true });
    const roomTypeMap = new Map(roomTypes.map((rt) => [rt.typeId, rt]));

    const housekeepingTasks = await req.tenantModels!.Housekeeping.find({});
    const housekeepingMap = new Map(housekeepingTasks.map((hk) => [hk.roomId, hk.cleaningStatus]));

    const bookings = await req.tenantModels!.Booking.find({
      status: { $nin: ['CANCELLED', 'NO_SHOW'] },
      $nor: [{ checkOut: { $lte: start } }, { checkIn: { $gte: end } }],
    });

    const guests = await req.tenantModels!.Guest.find({});
    const guestMap = new Map(guests.map((g) => [g.guestId, `${g.firstName} ${g.lastName}`]));

    const gridData = rooms.map((room) => {
      const rt = roomTypeMap.get(room.roomTypeId);
      const roomBookings = bookings
        .filter((b) => b.roomId === room.roomId)
        .map((b) => ({
          bookingId: b.bookingId,
          bookingNumber: b.bookingNumber,
          guestName: guestMap.get(b.guestId) || 'Guest',
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          status: b.status,
          source: b.source,
          totalAmount: b.totalAmount,
          paidAmount: b.paidAmount || 0,
          paymentStatus: b.paymentStatus || 'PENDING',
        }));

      return {
        roomId: room.roomId,
        roomNumber: room.number,
        floor: room.floor,
        status: room.status,
        cleaningStatus: housekeepingMap.get(room.roomId) || (room.status === 'OCCUPIED' ? 'DIRTY' : 'CLEAN'),
        roomTypeId: room.roomTypeId,
        roomTypeName: rt?.name || 'Standard Room',
 basePrice: rt?.basePrice || 0,
        bookings: roomBookings,
      };
    });

    res.json({
      success: true,
      data: {
        year: start.getFullYear(),
        month: start.getMonth() + 1,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        rooms: gridData,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
