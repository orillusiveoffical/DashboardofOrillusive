import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);

router.get('/analytics', async (req, res, next) => {
  try {
    const tenantModels = req.tenantModels!;

    const totalRooms = await tenantModels.Room.countDocuments({ isActive: true });
    const occupiedRooms = await tenantModels.Room.countDocuments({ status: 'OCCUPIED', isActive: true });
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const allBookings = await tenantModels.Booking.find();
    const activeBookings = allBookings.filter((b) => b.status !== 'CANCELLED');
    const cancelledCount = allBookings.filter((b) => b.status === 'CANCELLED').length;

    const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    // Source breakdown
    const sourceMap: Record<string, { count: number; revenue: number }> = {};
    for (const bk of activeBookings) {
      const src = bk.externalSource || bk.source || 'DIRECT';
      if (!sourceMap[src]) {
        sourceMap[src] = { count: 0, revenue: 0 };
      }
      sourceMap[src].count += 1;
      sourceMap[src].revenue += bk.totalAmount || 0;
    }

    const channelPerformance = Object.keys(sourceMap).map((channel) => ({
      channel,
      bookingsCount: sourceMap[channel].count,
      revenuePkr: sourceMap[channel].revenue,
    }));

    res.json({
      success: true,
      data: {
        totalRooms,
        occupiedRooms,
        occupancyRate,
        totalBookings: allBookings.length,
        activeBookingsCount: activeBookings.length,
        cancelledBookingsCount: cancelledCount,
        totalRevenuePkr: totalRevenue,
        channelPerformance,
        currency: req.tenant!.currency || 'PKR',
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
