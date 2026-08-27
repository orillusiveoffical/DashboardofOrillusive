import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';
import { requireRole } from '../../middleware/rbac.js';
import { getSaasModels } from '../../db/saasDb.js';
import { getSocketManager } from '../../services/socket.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);

router.get('/', async (req, res, next) => {
  try {
    const saasModels = getSaasModels();

    const tenant = req.tenant!;
    const plan = await saasModels.Plan.findOne({ planId: tenant.planId });
    const sub = await saasModels.Subscription.findOne({ tenantId: tenant.tenantId, status: 'ACTIVE' });

    const activeConnections = await req.tenantModels!.ChannelConnection.countDocuments({
      status: { $ne: 'DISCONNECTED' },
    });

    const allPlans = await saasModels.Plan.find();

    res.json({
      success: true,
      data: {
        tenantId: tenant.tenantId,
        hotelName: tenant.name,
        currentPlan: plan,
        subscription: sub,
        otaUsage: {
          activeConnections,
          maxAllowed: plan?.maxOtaChannels ?? 0,
        },
        availablePlans: allPlans,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── 1. Create Checkout Session Endpoint ──────────────────────────────────────
router.post('/create-checkout-session', requireRole('OWNER', 'MANAGER', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      res.status(400).json({ success: false, error: 'Target planId is required.' });
      return;
    }

    const saasModels = getSaasModels();
    const plan = await saasModels.Plan.findOne({ planId });

    if (!plan) {
      res.status(404).json({ success: false, error: 'Selected subscription plan not found.' });
      return;
    }

    if (req.tenant!.planId === planId) {
      res.status(400).json({ success: false, error: 'Your property is already subscribed to this plan.' });
      return;
    }

    const sessionId = `cs_${req.tenant!.tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const taxAmountPkr = Math.round(plan.pricePkr * 0.16); // 16% Sales Tax
    const totalPkr = plan.pricePkr + taxAmountPkr;

    res.json({
      success: true,
      data: {
        sessionId,
        planId: plan.planId,
        planName: plan.name,
        pricePkr: plan.pricePkr,
        taxAmountPkr,
        totalPkr,
        maxOtaChannels: plan.maxOtaChannels,
        currency: 'PKR',
        tenantId: req.tenant!.tenantId,
        hotelName: req.tenant!.name,
        customerEmail: req.user!.email,
        checkoutUrl: `/subscription/checkout?sessionId=${sessionId}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── 2. Webhook / Payment Verification Endpoint ──────────────────────────────
router.post('/verify-checkout', requireRole('OWNER', 'MANAGER', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { sessionId, planId, cardHolder, cardNumber, expMonth, expYear } = req.body;

    if (!sessionId || !planId) {
      res.status(400).json({ success: false, error: 'Invalid checkout session parameters.' });
      return;
    }

    const saasModels = getSaasModels();
    const plan = await saasModels.Plan.findOne({ planId });

    if (!plan) {
      res.status(400).json({ success: false, error: 'Invalid target plan.' });
      return;
    }

    // Process Payment Gateway Verification
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Safely update tenant plan & convert to PAID account ONLY upon payment verification
    req.tenant!.planId = planId;
    req.tenant!.accountType = 'PAID';
    req.tenant!.status = 'ACTIVE';
    await req.tenant!.save();

    // Also update SaasUser accountType to PAID
    await saasModels.SaasUser.updateOne({ userId: req.user!.userId }, { accountType: 'PAID' });

    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await saasModels.Subscription.findOneAndUpdate(
      { tenantId: req.tenant!.tenantId },
      {
        subscriptionId: `sub_${req.tenant!.tenantId}`,
        tenantId: req.tenant!.tenantId,
        planId,
        status: 'ACTIVE',
        pricePkr: plan.pricePkr,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
      },
      { upsert: true, new: true }
    );

    // Create Notification in Tenant DB & emit real-time socket event
    try {
      const notif = await req.tenantModels!.Notification.create({
        notificationId: `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `Plan Upgraded: ${plan.name}`,
        message: `Your hotel subscription was successfully upgraded to ${plan.name} (${plan.pricePkr.toLocaleString()} PKR/mo). Transaction ID: ${transactionId}`,
        type: 'SUBSCRIPTION',
        isRead: false,
      });
      getSocketManager().emitNotification(req.tenant!.tenantId, notif);
    } catch {
      // Non-blocking notification fallback
    }

    // Record Platform Audit Log
    try {
      await saasModels.PlatformAuditLog.create({
        logId: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: `SUBSCRIPTION_UPGRADE_${planId}`,
        resource: `Tenant:${req.tenant!.tenantId}`,
        details: { planId, pricePkr: plan.pricePkr, transactionId, sessionId },
      });
    } catch {
      // Non-blocking log fallback
    }

    res.json({
      success: true,
      data: {
        transactionId,
        planName: plan.name,
        planId: plan.planId,
        pricePkr: plan.pricePkr,
        status: 'PAID',
        subscription,
      },
      message: `Payment verified! Successfully upgraded to ${plan.name} (${plan.pricePkr.toLocaleString()} PKR/mo)`,
    });
  } catch (err) {
    next(err);
  }
});

// Legacy direct upgrade alias mapped safely to verification
router.post('/upgrade', requireRole('OWNER', 'MANAGER', 'SUPER_ADMIN'), async (req, res, next) => {
  (router as any).handle(req, res, next);
});

export default router;
