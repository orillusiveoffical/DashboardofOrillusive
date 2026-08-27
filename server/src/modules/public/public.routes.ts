import { Router } from 'express';
import { getSaasModels } from '../../db/saasDb.js';
import { getTenantDatabase } from '../../db/tenantManager.js';
import { channelManagerService } from '../../services/ota/ChannelManagerService.js';

const router = Router();

// ─── Public Hotel Profile Info ───────────────────────────────────────────────
router.get('/:tenantSlug/info', async (req, res, next) => {
  try {
    const { tenantSlug } = req.params;
    const saasModels = getSaasModels();
    const tenant = await saasModels.Tenant.findOne({ slug: tenantSlug, status: 'ACTIVE' });

    if (!tenant) {
      res.status(404).json({ success: false, error: 'Hotel website not found.' });
      return;
    }

    const { models: tenantModels } = await getTenantDatabase(tenant.tenantId);
    const roomTypes = await tenantModels.RoomType.find({ isActive: true });
    const settings = await tenantModels.TenantSettings.findOne();

    res.json({
      success: true,
      data: {
        hotelName: tenant.name,
        slug: tenant.slug,
        phone: tenant.phone,
        city: tenant.city,
        country: tenant.country,
        currency: tenant.currency,
        logoUrl: tenant.logoUrl,
        checkInTime: settings?.checkInTime || '14:00',
        checkOutTime: settings?.checkOutTime || '12:00',
        cancellationPolicy: settings?.cancellationPolicy,
        roomTypes,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Check Real-Time Availability for Website Visitors ──────────────────────
router.get('/:tenantSlug/availability', async (req, res, next) => {
  try {
    const { tenantSlug } = req.params;
    const { checkIn, checkOut, adults = '1' } = req.query;

    if (!checkIn || !checkOut) {
      res.status(400).json({ success: false, error: 'Check-in and check-out dates are required.' });
      return;
    }

    const checkInDate = new Date(checkIn as string);
    const checkOutDate = new Date(checkOut as string);

    if (checkInDate >= checkOutDate) {
      res.status(400).json({ success: false, error: 'Check-out date must be after check-in date.' });
      return;
    }

    const saasModels = getSaasModels();
    const tenant = await saasModels.Tenant.findOne({ slug: tenantSlug, status: 'ACTIVE' });
    if (!tenant) {
      res.status(404).json({ success: false, error: 'Hotel not found.' });
      return;
    }

    const { models: tenantModels } = await getTenantDatabase(tenant.tenantId);

    const roomTypes = await tenantModels.RoomType.find({ isActive: true });
    const availableRoomTypes = [];

    for (const rt of roomTypes) {
      if (rt.maxOccupancy < Number(adults)) continue;

      const rooms = await tenantModels.Room.find({ roomTypeId: rt.typeId, isActive: true });
      let availableCount = 0;

      for (const room of rooms) {
        const overlap = await tenantModels.Booking.findOne({
          roomId: room.roomId,
          status: { $nin: ['CANCELLED', 'NO_SHOW'] },
          $nor: [
            { checkOut: { $lte: checkInDate } },
            { checkIn: { $gte: checkOutDate } },
          ],
        });

        if (!overlap) {
          availableCount++;
        }
      }

      if (availableCount > 0) {
        // Calculate nights
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24));
        const totalPrice = rt.basePrice * nights;

        availableRoomTypes.push({
          ...rt.toObject(),
          availableUnits: availableCount,
          nights,
          totalPrice,
        });
      }
    }

    res.json({
      success: true,
      data: {
        checkIn: checkInDate,
        checkOut: checkOutDate,
        availableRoomTypes,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Direct Website Guest Reservation Checkout ──────────────────────────────
router.post('/:tenantSlug/bookings', async (req, res, next) => {
  try {
    const { tenantSlug } = req.params;
    const { roomTypeId, checkIn, checkOut, firstName, lastName, email, phone, specialRequests } = req.body;

    if (!roomTypeId || !checkIn || !checkOut || !firstName || !lastName || !email) {
      res.status(400).json({ success: false, error: 'Please provide all guest and booking details.' });
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const saasModels = getSaasModels();
    const tenant = await saasModels.Tenant.findOne({ slug: tenantSlug, status: 'ACTIVE' });
    if (!tenant) {
      res.status(404).json({ success: false, error: 'Hotel not found.' });
      return;
    }

    const { models: tenantModels } = await getTenantDatabase(tenant.tenantId);

    // 1. Find available room for selected dates
    const rooms = await tenantModels.Room.find({ roomTypeId, isActive: true });
    let selectedRoomId: string | null = null;

    for (const room of rooms) {
      const overlap = await tenantModels.Booking.findOne({
        roomId: room.roomId,
        status: { $nin: ['CANCELLED', 'NO_SHOW'] },
        $nor: [
          { checkOut: { $lte: checkInDate } },
          { checkIn: { $gte: checkOutDate } },
        ],
      });

      if (!overlap) {
        selectedRoomId = room.roomId;
        break;
      }
    }

    if (!selectedRoomId) {
      res.status(409).json({
        success: false,
        error: 'Sorry! Selected room type is no longer available for these dates.',
        code: 'NO_ROOM_AVAILABLE',
      });
      return;
    }

    // 2. Resolve guest
    let guest = await tenantModels.Guest.findOne({ email });
    if (!guest) {
      guest = await tenantModels.Guest.create({
        guestId: `gst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        firstName,
        lastName,
        email,
        phone,
      });
    }

    // 3. Compute price
    const roomType = await tenantModels.RoomType.findOne({ typeId: roomTypeId });
    const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24)));
    const totalAmount = (roomType?.basePrice || 10000) * nights;

    // 4. Create Direct Reservation
    const bookingId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const bookingNumber = `WEB-${Math.floor(100000 + Math.random() * 900000)}`;

    const booking = await tenantModels.Booking.create({
      bookingId,
      bookingNumber,
      guestId: guest.guestId,
      roomId: selectedRoomId,
      roomTypeId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults: 1,
      children: 0,
      status: 'CONFIRMED',
      source: 'WEBSITE',
      totalAmount,
      paidAmount: totalAmount, // Confirmed website booking
      paymentStatus: 'COMPLETED',
      specialRequests,
    });

    // 5. Update OTA channels with consumed inventory
    channelManagerService.syncTenantInventoryToChannels(tenantModels, tenant.tenantId);

    res.status(201).json({
      success: true,
      data: {
        bookingId: booking.bookingId,
        bookingNumber: booking.bookingNumber,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalAmount: booking.totalAmount,
        currency: tenant.currency,
        message: 'Your reservation has been confirmed successfully!',
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
