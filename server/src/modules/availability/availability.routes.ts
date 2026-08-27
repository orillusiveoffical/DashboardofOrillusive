import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';
import { requireRole } from '../../middleware/rbac.js';
import { channelManagerService } from '../../services/ota/ChannelManagerService.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);

router.get('/', async (req, res, next) => {
  try {
    const rooms = await req.tenantModels!.Room.find({ isActive: true }).sort({ number: 1 });
    const bookings = await req.tenantModels!.Booking.find({
      status: { $nin: ['CANCELLED', 'NO_SHOW'] },
    });

    const roomAvailability = rooms.map((room) => {
      const roomBookings = bookings
        .filter((b) => b.roomId === room.roomId)
        .map((b) => ({
          bookingId: b.bookingId,
          bookingNumber: b.bookingNumber,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          status: b.status,
        }));

      return {
        roomId: room.roomId,
        roomNumber: room.number,
        status: room.status,
        bookings: roomBookings,
      };
    });

    res.json({ success: true, data: roomAvailability });
  } catch (err) {
    next(err);
  }
});

router.post('/block', requireRole('OWNER', 'MANAGER'), async (req, res, next) => {
  try {
    const { roomId, status = 'BLOCKED', notes } = req.body;
    if (!roomId) {
      res.status(400).json({ success: false, error: 'Room ID is required.' });
      return;
    }

    const room = await req.tenantModels!.Room.findOneAndUpdate(
      { roomId },
      { status, notes },
      { new: true }
    );

    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found.' });
      return;
    }

    // Trigger immediate OTA sync
    channelManagerService.syncTenantInventoryToChannels(req.tenantModels!, req.tenant!.tenantId);

    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

router.post('/unblock', requireRole('OWNER', 'MANAGER'), async (req, res, next) => {
  try {
    const { roomId } = req.body;
    if (!roomId) {
      res.status(400).json({ success: false, error: 'Room ID is required.' });
      return;
    }

    const room = await req.tenantModels!.Room.findOneAndUpdate(
      { roomId },
      { status: 'AVAILABLE' },
      { new: true }
    );

    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found.' });
      return;
    }

    channelManagerService.syncTenantInventoryToChannels(req.tenantModels!, req.tenant!.tenantId);

    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

export default router;
