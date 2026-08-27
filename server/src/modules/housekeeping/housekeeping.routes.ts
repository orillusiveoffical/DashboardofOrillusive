import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';
import { requireRole } from '../../middleware/rbac.js';
import { getSocketManager } from '../../services/socket.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);

router.get('/', async (req, res, next) => {
  try {
    const rooms = await req.tenantModels!.Room.find({ isActive: true });
    const housekeepingTasks = await req.tenantModels!.Housekeeping.find();
    const taskMap = new Map(housekeepingTasks.map((t) => [t.roomId, t]));

    const result = rooms.map((room) => {
      const task = taskMap.get(room.roomId);
      return {
        roomId: room.roomId,
        roomNumber: room.number,
        floor: room.floor,
        roomStatus: room.status,
        cleaningStatus: task?.cleaningStatus || (room.status === 'OCCUPIED' ? 'DIRTY' : 'CLEAN'),
        assignedTo: task?.assignedTo || 'Unassigned',
        notes: task?.notes || '',
        lastCleanedAt: task?.lastCleanedAt || room.updatedAt,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.patch('/:roomId', requireRole('OWNER', 'MANAGER', 'STAFF'), async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { cleaningStatus, assignedTo, notes } = req.body;

    const room = await req.tenantModels!.Room.findOne({ roomId });
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found.' });
      return;
    }

    const taskId = `hk_${roomId}`;
    const task = await req.tenantModels!.Housekeeping.findOneAndUpdate(
      { roomId },
      {
        taskId,
        roomId,
        roomNumber: room.number,
        cleaningStatus,
        assignedTo,
        notes,
        lastCleanedAt: cleaningStatus === 'CLEAN' ? new Date() : undefined,
      },
      { upsert: true, new: true }
    );

    if (cleaningStatus === 'CLEAN' && room.status === 'MAINTENANCE') {
      await req.tenantModels!.Room.updateOne({ roomId }, { status: 'AVAILABLE' });
    }

    try {
      const notif = await req.tenantModels!.Notification.create({
        notificationId: `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `Room ${room.number} Housekeeping Updated`,
        message: `Housekeeping status set to ${cleaningStatus}${assignedTo ? ` (Assigned: ${assignedTo})` : ''}`,
        type: 'SYSTEM',
        isRead: false,
      });
      getSocketManager().emitNotification(req.tenant!.tenantId, notif);
    } catch (e) {}

    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

export default router;
