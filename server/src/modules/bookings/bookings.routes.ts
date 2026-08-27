import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';
import { requireRole } from '../../middleware/rbac.js';
import { channelManagerService } from '../../services/ota/ChannelManagerService.js';
import { getSocketManager } from '../../services/socket.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);

// ─── List Bookings ──────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { status, search, limit = '50', page = '1' } = req.query;
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    const bookings = await req.tenantModels!.Booking.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // Populate guest and room names
    const populated = await Promise.all(
      bookings.map(async (bk) => {
        const guest = await req.tenantModels!.Guest.findOne({ guestId: bk.guestId });
        const room = await req.tenantModels!.Room.findOne({ roomId: bk.roomId });
        const roomType = room ? await req.tenantModels!.RoomType.findOne({ typeId: room.roomTypeId }) : null;
        return {
          ...bk.toObject(),
          guestName: guest ? `${guest.firstName} ${guest.lastName}` : 'Guest',
          guestEmail: guest?.email,
          roomNumber: room?.number || 'N/A',
          roomTypeName: roomType?.name || 'Standard',
        };
      })
    );

    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

// ─── Create Booking (DOUBLE BOOKING PREVENTION) ─────────────────────────────
router.post('/', requireRole('OWNER', 'MANAGER', 'STAFF'), async (req, res, next) => {
  try {
    const {
      guestId,
      firstName,
      lastName,
      email,
      phone,
      roomId,
      checkIn,
      checkOut,
      adults = 1,
      children = 0,
      totalAmount,
      paidAmount = 0,
      source = 'DIRECT',
      specialRequests,
    } = req.body;

    if (!roomId || !checkIn || !checkOut || !totalAmount) {
      res.status(400).json({ success: false, error: 'Room ID, check-in, check-out, and total amount are required.' });
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate >= checkOutDate) {
      res.status(400).json({ success: false, error: 'Check-out date must be after check-in date.' });
      return;
    }

    // 1. Double Booking Prevention Check
    const overlapping = await req.tenantModels!.Booking.findOne({
      roomId,
      status: { $nin: ['CANCELLED', 'NO_SHOW'] },
      $nor: [
        { checkOut: { $lte: checkInDate } },
        { checkIn: { $gte: checkOutDate } },
      ],
    });

    if (overlapping) {
      res.status(409).json({
        success: false,
        error: `Room is unavailable for selected dates (${checkInDate.toISOString().split('T')[0]} to ${checkOutDate.toISOString().split('T')[0]}). Conflicting reservation: ${overlapping.bookingNumber}`,
        code: 'DOUBLE_BOOKING_PREVENTED',
      });
      return;
    }

    // 2. Resolve Guest
    let targetGuestId = guestId;
    if (!targetGuestId) {
      if (!firstName || !lastName) {
        res.status(400).json({ success: false, error: 'Guest details (firstName, lastName) required.' });
        return;
      }

      const newGuest = await req.tenantModels!.Guest.create({
        guestId: `gst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        firstName,
        lastName,
        email,
        phone,
      });
      targetGuestId = newGuest.guestId;
    }

    // 3. Resolve Room and Room Type
    const room = await req.tenantModels!.Room.findOne({ roomId });
    if (!room) {
      res.status(404).json({ success: false, error: 'Target room not found.' });
      return;
    }

    // 4. Create Reservation
    const bookingId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const bookingNumber = `BK-${Math.floor(100000 + Math.random() * 900000)}`;

    const booking = await req.tenantModels!.Booking.create({
      bookingId,
      bookingNumber,
      guestId: targetGuestId,
      roomId,
      roomTypeId: room.roomTypeId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults: Number(adults),
      children: Number(children),
      status: 'CONFIRMED',
      source,
      totalAmount: Number(totalAmount),
      paidAmount: Number(paidAmount),
      paymentStatus: Number(paidAmount) >= Number(totalAmount) ? 'COMPLETED' : Number(paidAmount) > 0 ? 'PARTIAL' : 'PENDING',
      specialRequests,
      createdById: req.user!.userId,
    });

    // 5. Update room status if check-in is today
    const todayStr = new Date().toISOString().split('T')[0];
    const checkInStr = checkInDate.toISOString().split('T')[0];
    if (checkInStr === todayStr) {
      await req.tenantModels!.Room.updateOne({ roomId }, { status: 'RESERVED' });
    }

    // 6. Push Inventory updates to all connected OTA Channels
    channelManagerService.syncTenantInventoryToChannels(req.tenantModels!, req.tenant!.tenantId);

    // 7. Socket.IO event for real-time calendar & notification update
    try {
      getSocketManager().emitCalendarUpdate(req.tenant!.tenantId, {
        type: 'NEW_BOOKING',
        bookingId: booking.bookingId,
        roomId,
      });

      const notif = await req.tenantModels!.Notification.create({
        notificationId: `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `New Reservation #${booking.bookingNumber}`,
        message: `Reservation confirmed for Room ${room.number} (${booking.checkIn.toISOString().split('T')[0]} to ${booking.checkOut.toISOString().split('T')[0]}). Amount: ${booking.totalAmount.toLocaleString()} PKR`,
        type: 'BOOKING',
        isRead: false,
      });

      getSocketManager().emitNotification(req.tenant!.tenantId, notif);
    } catch (e) {}

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

// ─── Check-In Booking ───────────────────────────────────────────────────────
// ─── Check-In Booking ───────────────────────────────────────────────────────
const handleCheckIn = async (req: any, res: any, next: any) => {
  try {
    const { bookingId } = req.params;
    const booking = await req.tenantModels!.Booking.findOne({ bookingId });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking record not found.' });
      return;
    }

    booking.status = 'CHECKED_IN';
    booking.checkedInAt = new Date();
    await booking.save();

    await req.tenantModels!.Room.updateOne({ roomId: booking.roomId }, { status: 'OCCUPIED' });

    try {
      const notif = await req.tenantModels!.Notification.create({
        notificationId: `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `Check-in Completed #${booking.bookingNumber}`,
        message: `Guest checked into Room ID ${booking.roomId} successfully.`,
        type: 'BOOKING',
        isRead: false,
      });
      getSocketManager().emitNotification(req.tenant!.tenantId, notif);
    } catch (e) {}

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

router.patch('/:bookingId/check-in', requireRole('OWNER', 'MANAGER', 'STAFF'), handleCheckIn);
router.post('/:bookingId/check-in', requireRole('OWNER', 'MANAGER', 'STAFF'), handleCheckIn);

// ─── Check-Out Booking ──────────────────────────────────────────────────────
const handleCheckOut = async (req: any, res: any, next: any) => {
  try {
    const { bookingId } = req.params;
    const booking = await req.tenantModels!.Booking.findOne({ bookingId });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking record not found.' });
      return;
    }

    booking.status = 'CHECKED_OUT';
    booking.checkedOutAt = new Date();
    await booking.save();

    await req.tenantModels!.Room.updateOne({ roomId: booking.roomId }, { status: 'AVAILABLE' });

    // Mark room as DIRTY in Housekeeping module
    const room = await req.tenantModels!.Room.findOne({ roomId: booking.roomId });
    if (room) {
      await req.tenantModels!.Housekeeping.findOneAndUpdate(
        { roomId: booking.roomId },
        {
          taskId: `hk_${booking.roomId}`,
          roomId: booking.roomId,
          roomNumber: room.number,
          cleaningStatus: 'DIRTY',
          notes: 'Marked DIRTY after guest check-out',
        },
        { upsert: true, new: true }
      );
    }

    // Sync inventory back to OTAs
    channelManagerService.syncTenantInventoryToChannels(req.tenantModels!, req.tenant!.tenantId);

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

router.patch('/:bookingId/check-out', requireRole('OWNER', 'MANAGER', 'STAFF'), handleCheckOut);
router.post('/:bookingId/check-out', requireRole('OWNER', 'MANAGER', 'STAFF'), handleCheckOut);

// ─── Cancel Booking ─────────────────────────────────────────────────────────
const handleCancel = async (req: any, res: any, next: any) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await req.tenantModels!.Booking.findOne({ bookingId });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking record not found.' });
      return;
    }

    booking.status = 'CANCELLED';
    booking.cancelledAt = new Date();
    booking.cancelReason = reason || 'Cancelled by staff';
    await booking.save();

    await req.tenantModels!.Room.updateOne({ roomId: booking.roomId }, { status: 'AVAILABLE' });

    // Instantly sync inventory back to connected OTA channels
    channelManagerService.syncTenantInventoryToChannels(req.tenantModels!, req.tenant!.tenantId);

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

router.patch('/:bookingId/cancel', requireRole('OWNER', 'MANAGER', 'STAFF'), handleCancel);
router.post('/:bookingId/cancel', requireRole('OWNER', 'MANAGER', 'STAFF'), handleCancel);
router.delete('/:bookingId', requireRole('OWNER', 'MANAGER', 'STAFF'), handleCancel);

export default router;
