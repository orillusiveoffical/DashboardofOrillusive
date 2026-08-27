import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);

router.get('/', async (req, res, next) => {
  try {
    const guests = await req.tenantModels!.Guest.find().sort({ createdAt: -1 });

    const populated = await Promise.all(
      guests.map(async (guest) => {
        const stayCount = await req.tenantModels!.Booking.countDocuments({ guestId: guest.guestId });
        return {
          ...guest.toObject(),
          totalStays: stayCount,
        };
      })
    );

    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, country, idType, idNumber, notes } = req.body;
    if (!firstName || !lastName) {
      res.status(400).json({ success: false, error: 'First name and last name are required.' });
      return;
    }

    const guestId = `gst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const guest = await req.tenantModels!.Guest.create({
      guestId,
      firstName,
      lastName,
      email,
      phone,
      country,
      idType,
      idNumber,
      notes,
    });

    res.status(201).json({ success: true, data: guest });
  } catch (err) {
    next(err);
  }
});

export default router;
