import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';
import { requireRole } from '../../middleware/rbac.js';
import { channelManagerService } from '../../services/ota/ChannelManagerService.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);

// ─── Room Types Endpoints ───────────────────────────────────────────────────
router.get('/types', async (req, res, next) => {
  try {
    const roomTypes = await req.tenantModels!.RoomType.find({ isActive: true });
    res.json({ success: true, data: roomTypes });
  } catch (err) {
    next(err);
  }
});

router.post('/types', requireRole('OWNER', 'MANAGER'), async (req, res, next) => {
  try {
    const { name, description, basePrice, maxOccupancy, beds, amenities, imageUrl } = req.body;
    if (!name || basePrice === undefined) {
      res.status(400).json({ success: false, error: 'Name and base price are required.' });
      return;
    }

    const typeId = `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const roomType = await req.tenantModels!.RoomType.create({
      typeId,
      name,
      description,
      basePrice: Number(basePrice),
      maxOccupancy: Number(maxOccupancy) || 2,
      beds,
      amenities: Array.isArray(amenities) ? amenities : [],
      imageUrl,
    });

    res.status(201).json({ success: true, data: roomType });
  } catch (err) {
    next(err);
  }
});

// ─── Rooms Endpoints ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const rooms = await req.tenantModels!.Room.find({ isActive: true });
    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('OWNER', 'MANAGER'), async (req, res, next) => {
  try {
    const { number, roomTypeId, floor, notes, basePrice } = req.body;
    if (!number || !roomTypeId) {
      res.status(400).json({ success: false, error: 'Room number and room type ID are required.' });
      return;
    }

    const existing = await req.tenantModels!.Room.findOne({ number });
    if (existing) {
      res.status(400).json({ success: false, error: `Room number ${number} already exists.` });
      return;
    }

    const roomId = `rm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const room = await req.tenantModels!.Room.create({
      roomId,
      roomTypeId,
      number,
      floor: floor ? Number(floor) : undefined,
      notes,
      status: 'AVAILABLE',
    });

    // Notify connected channels of updated inventory count
    channelManagerService.syncTenantInventoryToChannels(req.tenantModels!, req.tenant!.tenantId);

    res.status(201).json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

router.patch('/:roomId/status', requireRole('OWNER', 'MANAGER', 'STAFF'), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const { roomId } = req.params;

    const validStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'BLOCKED', 'OUT_OF_SERVICE'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid room status provided.' });
      return;
    }

    const room = await req.tenantModels!.Room.findOneAndUpdate(
      { roomId },
      { status, notes, updatedAt: new Date() },
      { new: true }
    );

    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found.' });
      return;
    }

    // Sync inventory change to OTA channels asynchronously
    channelManagerService.syncTenantInventoryToChannels(req.tenantModels!, req.tenant!.tenantId);

    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

export default router;
