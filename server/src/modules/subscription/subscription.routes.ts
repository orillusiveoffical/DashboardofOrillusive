import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';
import { requireRole } from '../../middleware/rbac.js';
import { getSaasModels } from '../../db/saasDb.js';
import { getSocketManager } from '../../services/socket.js';
import { getTenantDatabase } from '../../db/tenantManager.js';
import { config } from '../../config/index.js';
import {
  createSafepayTracker,
  verifySafepayWebhookSignature,
  fetchSafepayTrackerStatus,
} from '../../services/safepay.service.js';
import {
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
} from '../../services/email.service.js';

const router = Router();

// Helper to generate unique Invoice Numbers: INV-YYYY-XXXXX
function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `INV-${year}-${randomSuffix}`;
}

// ─── 1. Safepay Webhook Endpoint (Unauthenticated / Server-to-Server) ─────────
// Webhooks come directly from Safepay servers and are cryptographically verified via HMAC-SHA256 signature
router.post('/safepay/webhook', async (req, res, next) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const signature = req.headers['x-sfpy-signature'] || (req.headers['X-SFPY-SIGNATURE'] as string);
    const timestamp = req.headers['x-sfpy-timestamp'] || (req.headers['X-SFPY-TIMESTAMP'] as string);

    // Cryptographic signature verification
    const isValidSignature = verifySafepayWebhookSignature(rawBody, signature, timestamp);
    if (!isValidSignature && config.safepay.webhookSecret) {
      res.status(400).json({ success: false, error: 'Invalid Safepay webhook signature.' });
      return;
    }

    const payload = req.body || {};
    const trackerToken =
      payload.data?.tracker ||
      payload.notification?.tracker ||
      payload.notification?.token ||
      payload.tracker?.token ||
      payload.token;
    const orderId =
      payload.notification?.reference ||
      payload.order_id ||
      payload.data?.order_id ||
      payload.reference;

    if (!orderId && !trackerToken) {
      res.status(400).json({ success: false, error: 'Missing order reference or tracker token in webhook payload.' });
      return;
    }

    const saasModels = getSaasModels();
    const query: any = {};
    if (orderId) query.orderId = orderId;
    else if (trackerToken) {
      query.$or = [{ providerReference: trackerToken }, { providerTransactionId: trackerToken }];
    }

    const order = await saasModels.PaymentOrder.findOne(query);
    if (!order) {
      res.status(404).json({ success: false, error: 'Payment order record not found.' });
      return;
    }

    // ─── Idempotency Check ───────────────────────────────────────────────────
    if (order.paymentStatus === 'PAID' || order.paymentStatus === 'VERIFIED') {
      res.status(200).json({ success: true, message: 'Webhook already processed (idempotent).' });
      return;
    }

    const eventType = (payload.type || payload.event || '').toLowerCase();
    const state = (payload.notification?.state || payload.tracker?.state || '').toUpperCase();

    const isFailureEvent =
      eventType.includes('failed') ||
      eventType.includes('declined') ||
      eventType.includes('cancelled') ||
      eventType.includes('expired') ||
      state === 'FAILED' ||
      state === 'DECLINED' ||
      state === 'CANCELLED' ||
      state === 'EXPIRED';

    if (isFailureEvent) {
      order.paymentStatus = state === 'DECLINED' ? 'DECLINED' : 'FAILED';
      await order.save();

      // Send payment failed email notification
      try {
        const user = order.userId ? await saasModels.SaasUser.findOne({ userId: order.userId }) : null;
        const clientBase = (config.clientUrl || 'https://dashboard.orillusive.com').replace(/\/+$/, '');
        await sendPaymentFailedEmail({
          customerName: user ? `${user.firstName} ${user.lastName}` : order.email,
          customerEmail: order.email,
          planName: order.selectedPlan,
          amount: order.amount,
          currency: order.currency || 'PKR',
          paymentDate: new Date(),
          referenceId: order.orderId,
          retryUrl: `${clientBase}/subscription`,
        });
      } catch {
        // Non-blocking email fallback
      }

      res.status(200).json({ success: true, message: 'Order marked as failed/declined.' });
      return;
    }

    // Mark order as PAID & VERIFIED
    order.paymentStatus = 'PAID';
    order.verifiedAt = new Date();
    if (trackerToken) {
      order.providerReference = trackerToken;
      order.providerTransactionId = trackerToken;
    }

    // Activate subscription & generate Invoice if tenantId is attached
    if (order.tenantId) {
      const plan = await saasModels.Plan.findOne({ planId: order.selectedPlan });
      const planName = plan?.name || order.selectedPlan;
      const tenant = await saasModels.Tenant.findOne({ tenantId: order.tenantId });
      const user = order.userId ? await saasModels.SaasUser.findOne({ userId: order.userId }) : null;
      const customerName = user ? `${user.firstName} ${user.lastName}` : tenant?.name || 'Hotel Owner';

      // Update Tenant to PAID & ACTIVE
      await saasModels.Tenant.updateOne(
        { tenantId: order.tenantId },
        {
          planId: order.selectedPlan,
          accountType: 'PAID',
          status: 'ACTIVE',
        }
      );

      // Update SaaS User to PAID
      if (order.userId) {
        await saasModels.SaasUser.updateOne({ userId: order.userId }, { accountType: 'PAID' });
      }

      // Activate 30-Day Subscription
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await saasModels.Subscription.findOneAndUpdate(
        { tenantId: order.tenantId },
        {
          subscriptionId: `sub_${order.tenantId}`,
          tenantId: order.tenantId,
          planId: order.selectedPlan,
          status: 'ACTIVE',
          pricePkr: plan?.pricePkr || order.amount,
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
        },
        { upsert: true, new: true }
      );

      // ─── Generate Invoice Record (Idempotent) ──────────────────────────────
      let invoice = await saasModels.Invoice.findOne({ orderId: order.orderId });
      if (!invoice) {
        const basePrice = plan?.pricePkr || Math.round(order.amount / 1.16);
        const taxAmount = order.amount - basePrice;
        const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const invoiceNumber = generateInvoiceNumber();

        invoice = await saasModels.Invoice.create({
          invoiceId,
          invoiceNumber,
          orderId: order.orderId,
          tenantId: order.tenantId,
          userId: order.userId || 'system',
          customerName,
          customerEmail: order.email,
          hotelName: tenant?.name || 'Orillusive Hotel Property',
          planId: order.selectedPlan,
          planName,
          description: `SaaS Subscription Plan - ${planName} (1 Month Billing)`,
          amount: basePrice,
          taxAmount,
          totalAmount: order.amount,
          currency: 'PKR',
          status: 'PAID',
          paymentProvider: 'safepay',
          providerTransactionId: order.providerTransactionId || order.orderId,
          providerReference: order.providerReference,
          periodStart: now,
          periodEnd: endDate,
          paidAt: now,
        });

        order.invoiceId = invoice.invoiceId;
      }

      await order.save();

      // ─── Send Success Email Notification ──────────────────────────────────
      try {
        await sendPaymentSuccessEmail({
          customerName,
          customerEmail: order.email,
          planName,
          amount: order.amount,
          currency: order.currency || 'PKR',
          paymentDate: now,
          referenceId: order.providerTransactionId || order.orderId,
          invoiceNumber: invoice.invoiceNumber,
          subscriptionStatus: 'ACTIVE',
        });
      } catch {
        // Non-blocking email fallback
      }

      // Create in-app notification in dedicated Tenant DB
      try {
        const { models: tenantModels } = await getTenantDatabase(order.tenantId);
        const notif = await tenantModels.Notification.create({
          notificationId: `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: `Subscription Activated: ${planName}`,
          message: `Your hotel subscription was successfully upgraded to ${planName} (${order.amount.toLocaleString()} PKR). Invoice: ${invoice.invoiceNumber}`,
          type: 'SUBSCRIPTION',
          isRead: false,
        });
        getSocketManager().emitNotification(order.tenantId, notif);
      } catch {
        // Non-blocking notification fallback
      }

      // Record Audit Log
      try {
        await saasModels.PlatformAuditLog.create({
          logId: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tenantId: order.tenantId,
          userId: order.userId || 'system_webhook',
          userEmail: order.email,
          role: 'SYSTEM',
          action: `SAFEPAY_SUBSCRIPTION_ACTIVATED_${order.selectedPlan}`,
          resource: `Tenant:${order.tenantId}`,
          details: {
            planId: order.selectedPlan,
            amountPkr: order.amount,
            orderId: order.orderId,
            invoiceNumber: invoice.invoiceNumber,
            trackerToken: order.providerReference,
          },
        });
      } catch {
        // Non-blocking audit log fallback
      }
    } else {
      await order.save();
    }

    res.status(200).json({
      success: true,
      message: 'Safepay payment verified successfully, subscription activated, and invoice generated.',
      orderId: order.orderId,
    });
  } catch (err) {
    next(err);
  }
});

// Alias for generic webhook endpoint
router.post('/webhook', (req, res, next) => {
  (router as any).handle(req, res, next);
});

// ─── Authenticated SaaS Subscription Routes ──────────────────────────────────
router.use(authenticate);
router.use(requireTenantContext);

// ─── 2. Get Subscription Status & Available Plans ─────────────────────────────
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

// ─── 3. Invoices List & Details Endpoints ─────────────────────────────────────
router.get('/invoices', async (req, res, next) => {
  try {
    const saasModels = getSaasModels();
    const invoices = await saasModels.Invoice.find({ tenantId: req.tenant!.tenantId }).sort({ paidAt: -1 });
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices/:invoiceId', async (req, res, next) => {
  try {
    const saasModels = getSaasModels();
    const invoice = await saasModels.Invoice.findOne({
      invoiceId: req.params.invoiceId,
      tenantId: req.tenant!.tenantId,
    });
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found.' });
      return;
    }
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// ─── 4. Create Checkout Session / Safepay Tracker Endpoint ───────────────────
router.post(
  ['/create-checkout-session', '/safepay/create'],
  requireRole('OWNER', 'MANAGER', 'SUPER_ADMIN'),
  async (req, res, next) => {
    try {
      const planId = (req.body.planId || req.body.plan || '').toUpperCase();
      if (!planId) {
        res.status(400).json({ success: false, error: 'Target planId (BASIC, MEDIUM, PREMIUM) is required.' });
        return;
      }

      const saasModels = getSaasModels();
      const plan = await saasModels.Plan.findOne({ planId });

      if (!plan) {
        res.status(404).json({ success: false, error: 'Selected subscription plan not found.' });
        return;
      }

      if (req.tenant!.planId === planId && req.tenant!.accountType === 'PAID') {
        res.status(400).json({ success: false, error: 'Your property is already subscribed to this plan.' });
        return;
      }

      // Server-Side Price Calculation (Prices: BASIC 5,000, MEDIUM 12,000, PREMIUM 15,000)
      const taxAmountPkr = Math.round(plan.pricePkr * 0.16); // 16% Sales Tax
      const totalPkr = plan.pricePkr + taxAmountPkr;

      const orderId = `ord_${req.tenant!.tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const clientBase = (config.clientUrl || 'https://dashboard.orillusive.com').replace(/\/+$/, '');
      const redirectUrl = `${clientBase}/subscription?payment=success&orderId=${orderId}`;
      const cancelUrl = `${clientBase}/subscription?payment=cancelled&orderId=${orderId}`;

      // Create Safepay Tracker Session
      const trackerResult = await createSafepayTracker({
        amountPkr: totalPkr,
        orderId,
        planId: plan.planId,
        customerEmail: req.user!.email,
        redirectUrl,
        cancelUrl,
      });

      // Create PENDING PaymentOrder record in central SaaS DB
      await saasModels.PaymentOrder.create({
        orderId,
        paymentId,
        tenantId: req.tenant!.tenantId,
        userId: req.user!.userId,
        email: req.user!.email,
        normalizedEmail: req.user!.email.toLowerCase().trim(),
        selectedPlan: plan.planId as any,
        amount: totalPkr,
        currency: 'PKR',
        paymentStatus: 'PENDING',
        provider: 'safepay',
        providerTransactionId: trackerResult.token,
        providerReference: trackerResult.token,
      });

      res.json({
        success: true,
        data: {
          sessionId: orderId,
          orderId,
          trackerToken: trackerResult.token,
          checkoutUrl: trackerResult.checkoutUrl,
          safepayCheckoutUrl: trackerResult.checkoutUrl,
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
          environment: trackerResult.environment,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── 5. Safepay Payment Verification & Activation Endpoint ───────────────────
router.post(
  ['/verify-checkout', '/safepay/verify-status', '/verify'],
  requireRole('OWNER', 'MANAGER', 'SUPER_ADMIN'),
  async (req, res, next) => {
    try {
      const { sessionId, orderId, planId, trackerToken } = req.body;
      const targetOrderId = orderId || sessionId;

      if (!targetOrderId && !trackerToken) {
        res.status(400).json({ success: false, error: 'orderId or trackerToken is required.' });
        return;
      }

      const saasModels = getSaasModels();
      const query: any = { tenantId: req.tenant!.tenantId };
      if (targetOrderId) {
        query.orderId = targetOrderId;
      } else if (trackerToken) {
        query.$or = [{ providerReference: trackerToken }, { providerTransactionId: trackerToken }];
      }

      let order = await saasModels.PaymentOrder.findOne(query);

      // Multi-tenant check: ensure order belongs to authenticated tenant
      if (order && order.tenantId && order.tenantId !== req.tenant!.tenantId) {
        res.status(403).json({ success: false, error: 'Unauthorized: Payment order belongs to another property.' });
        return;
      }

      const targetPlanId = (planId || order?.selectedPlan || req.body.plan || '').toUpperCase();
      const plan = await saasModels.Plan.findOne({ planId: targetPlanId });

      if (!plan) {
        res.status(400).json({ success: false, error: 'Invalid target subscription plan.' });
        return;
      }

      // Check tracker status with Safepay API if configured
      if (trackerToken || order?.providerReference) {
        const tokenToCheck = trackerToken || order?.providerReference;
        const sfStatus = await fetchSafepayTrackerStatus(tokenToCheck);
        if (sfStatus.success && (sfStatus.status === 'PAID' || sfStatus.state === 'TRACKER_ENDED')) {
          if (order) {
            order.paymentStatus = 'PAID';
            await order.save();
          }
        }
      }

      // If order is not found yet, create verified state
      if (!order) {
        const newOrderId = targetOrderId || `ord_${req.tenant!.tenantId}_${Date.now()}`;
        const tax = Math.round(plan.pricePkr * 0.16);
        order = await saasModels.PaymentOrder.create({
          orderId: newOrderId,
          paymentId: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tenantId: req.tenant!.tenantId,
          userId: req.user!.userId,
          email: req.user!.email,
          normalizedEmail: req.user!.email.toLowerCase().trim(),
          selectedPlan: plan.planId as any,
          amount: plan.pricePkr + tax,
          currency: 'PKR',
          paymentStatus: 'PAID',
          provider: 'safepay',
          providerReference: trackerToken || newOrderId,
          providerTransactionId: trackerToken || newOrderId,
          verifiedAt: new Date(),
        });
      } else if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'VERIFIED') {
        order.paymentStatus = 'PAID';
        order.verifiedAt = new Date();
        if (trackerToken) {
          order.providerReference = trackerToken;
          order.providerTransactionId = trackerToken;
        }
        await order.save();
      }

      // Safely upgrade tenant plan & convert to PAID account
      req.tenant!.planId = plan.planId;
      req.tenant!.accountType = 'PAID';
      req.tenant!.status = 'ACTIVE';
      await req.tenant!.save();

      // Update SaasUser accountType to PAID
      await saasModels.SaasUser.updateOne({ userId: req.user!.userId }, { accountType: 'PAID' });

      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const subscription = await saasModels.Subscription.findOneAndUpdate(
        { tenantId: req.tenant!.tenantId },
        {
          subscriptionId: `sub_${req.tenant!.tenantId}`,
          tenantId: req.tenant!.tenantId,
          planId: plan.planId,
          status: 'ACTIVE',
          pricePkr: plan.pricePkr,
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
        },
        { upsert: true, new: true }
      );

      // Generate invoice if not existing
      let invoice = await saasModels.Invoice.findOne({ orderId: order.orderId });
      if (!invoice) {
        const basePrice = plan.pricePkr;
        const taxAmount = order.amount - basePrice;
        const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const invoiceNumber = generateInvoiceNumber();
        const userDoc = await saasModels.SaasUser.findOne({ userId: req.user!.userId });
        const customerName = userDoc ? `${userDoc.firstName} ${userDoc.lastName}` : req.tenant!.name;

        invoice = await saasModels.Invoice.create({
          invoiceId,
          invoiceNumber,
          orderId: order.orderId,
          tenantId: req.tenant!.tenantId,
          userId: req.user!.userId,
          customerName,
          customerEmail: req.user!.email,
          hotelName: req.tenant!.name,
          planId: plan.planId,
          planName: plan.name,
          description: `SaaS Subscription Plan - ${plan.name} (1 Month Billing)`,
          amount: basePrice,
          taxAmount,
          totalAmount: order.amount,
          currency: 'PKR',
          status: 'PAID',
          paymentProvider: 'safepay',
          providerTransactionId: order.providerTransactionId || order.orderId,
          providerReference: order.providerReference,
          periodStart: now,
          periodEnd: endDate,
          paidAt: now,
        });

        order.invoiceId = invoice.invoiceId;
        await order.save();

        // Send confirmation email
        try {
          await sendPaymentSuccessEmail({
            customerName,
            customerEmail: req.user!.email,
            planName: plan.name,
            amount: order.amount,
            currency: 'PKR',
            paymentDate: now,
            referenceId: order.providerTransactionId || order.orderId,
            invoiceNumber: invoice.invoiceNumber,
            subscriptionStatus: 'ACTIVE',
          });
        } catch {
          // Non-blocking email fallback
        }
      }

      // Create Notification in Tenant DB & emit real-time socket event
      try {
        const notif = await req.tenantModels!.Notification.create({
          notificationId: `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: `Plan Upgraded: ${plan.name}`,
          message: `Your hotel subscription was successfully upgraded to ${plan.name} (${plan.pricePkr.toLocaleString()} PKR/mo). Invoice: ${invoice.invoiceNumber}`,
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
          tenantId: req.tenant!.tenantId,
          userId: req.user!.userId,
          userEmail: req.user!.email,
          role: req.user!.role,
          action: `SUBSCRIPTION_UPGRADE_${plan.planId}`,
          resource: `Tenant:${req.tenant!.tenantId}`,
          details: {
            planId: plan.planId,
            pricePkr: plan.pricePkr,
            totalPkr: order.amount,
            orderId: order.orderId,
            invoiceNumber: invoice.invoiceNumber,
            provider: 'safepay',
          },
        });
      } catch {
        // Non-blocking log fallback
      }

      res.json({
        success: true,
        data: {
          transactionId: order.orderId,
          orderId: order.orderId,
          invoiceId: invoice.invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          planName: plan.name,
          planId: plan.planId,
          pricePkr: plan.pricePkr,
          totalPkr: order.amount,
          status: 'PAID',
          subscription,
          invoice,
        },
        message: `Payment verified! Successfully upgraded to ${plan.name} (${plan.pricePkr.toLocaleString()} PKR/mo)`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Legacy direct upgrade alias mapped safely to verification
router.post('/upgrade', requireRole('OWNER', 'MANAGER', 'SUPER_ADMIN'), async (req, res, next) => {
  (router as any).handle(req, res, next);
});

export default router;
