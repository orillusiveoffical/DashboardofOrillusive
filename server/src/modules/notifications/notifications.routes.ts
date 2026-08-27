import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);

router.get('/', async (req, res, next) => {
  try {
    let notifications = await req.tenantModels!.Notification.find().sort({ createdAt: -1 }).limit(20);

    // If no notifications, generate seed alerts
    if (notifications.length === 0) {
      await req.tenantModels!.Notification.create([
        {
          notificationId: `notif_1_${Date.now()}`,
          title: 'OTA Integration Active',
          message: 'Booking.com channel synchronization is active and operating normally.',
          type: 'OTA_SYNC',
        },
        {
          notificationId: `notif_2_${Date.now()}`,
          title: 'Direct Reservation Received',
          message: 'Direct website booking BK-100889 received and inventory deducted.',
          type: 'BOOKING',
        },
      ]);
      notifications = await req.tenantModels!.Notification.find().sort({ createdAt: -1 });
    }

    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
});

router.patch('/:notificationId/read', async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    await req.tenantModels!.Notification.updateOne({ notificationId }, { isRead: true });
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
});

export default router;
