import { Router } from 'express';
import {
  startDemo,
  createPaidOrder,
  verifyPaidPayment,
  loginUser,
  checkDemoEligibility,
  registerTenant,
} from './auth.service.js';
import { authenticate } from '../../middleware/auth.js';
import { getSaasModels } from '../../db/saasDb.js';

const router = Router();

// ─── 1. Check Demo Eligibility ────────────────────────────────────────────────
router.get('/check-demo-eligibility', async (req, res, next) => {
  try {
    const email = (req.query.email as string) || '';
    if (!email) {
      res.status(400).json({ success: false, error: 'Email parameter is required.' });
      return;
    }
    const result = await checkDemoEligibility(email);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── 2. Start 3-Day Demo Endpoint ──────────────────────────────────────────────
router.post('/start-demo', async (req, res, next) => {
  try {
    const { hotelName, firstName, lastName, email, password, phone, city, country } = req.body;
    if (!hotelName || !firstName || !lastName || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Please provide hotel name, first name, last name, email, and password for demo activation.',
      });
      return;
    }

    const result = await startDemo({
      hotelName,
      firstName,
      lastName,
      email,
      password,
      phone,
      city,
      country,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to start 3-day demo.' });
  }
});

// ─── 3. Create Paid Registration Payment Order (Step 1 of Paid Plan) ───────────
router.post('/create-paid-order', async (req, res, next) => {
  try {
    const { hotelName, firstName, lastName, email, password, planId, phone, city, country } = req.body;
    if (!hotelName || !firstName || !lastName || !email || !password || !planId) {
      res.status(400).json({
        success: false,
        error: 'Hotel name, user details, email, password, and plan selection (BASIC, MEDIUM, PREMIUM) are required.',
      });
      return;
    }

    const result = await createPaidOrder({
      hotelName,
      firstName,
      lastName,
      email,
      password,
      planId,
      phone,
      city,
      country,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to create payment order.' });
  }
});

// ─── 4. Server-Side Payment Verification & Activation (Step 2 of Paid Plan) ────
router.post('/verify-paid-payment', async (req, res, next) => {
  try {
    const { orderId, cardHolder, cardNumber, expMonth, expYear, transactionRef, simulateFailure } = req.body;
    if (!orderId) {
      res.status(400).json({ success: false, error: 'orderId is required for payment verification.' });
      return;
    }

    const result = await verifyPaidPayment({
      orderId,
      cardHolder,
      cardNumber,
      expMonth,
      expYear,
      transactionRef,
      simulateFailure,
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Payment verification failed.' });
  }
});

// ─── 5. Authenticate / Login User ─────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const result = await loginUser({ email, password });
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.code === 'DEMO_EXPIRED' || err.code === 'SUBSCRIPTION_EXPIRED' || err.code === 'TENANT_SUSPENDED') {
      res.status(401).json({ success: false, error: err.message, code: err.code });
      return;
    }
    res.status(401).json({ success: false, error: err.message || 'Invalid email or password.' });
  }
});

// ─── 6. Legacy Register Route (For backwards compatibility/testing) ─────────────
router.post('/register', async (req, res, next) => {
  try {
    const { hotelName, ownerEmail, email, password, firstName, lastName, phone, city, country, planId } = req.body;
    const targetEmail = ownerEmail || email;

    if (!hotelName || !targetEmail || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        error: 'Please provide hotel name, owner email, password, first name, and last name.',
      });
      return;
    }

    const result = await registerTenant({
      hotelName,
      ownerEmail: targetEmail,
      email: targetEmail,
      password,
      firstName,
      lastName,
      phone,
      city,
      country,
      planId: planId || 'BASIC',
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Registration failed.' });
  }
});

// ─── 7. Current Authenticated User Info ────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const saasModels = getSaasModels();
    const user = await saasModels.SaasUser.findOne({ userId: req.user!.userId }).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, error: 'User profile not found.' });
      return;
    }

    let tenant = null;
    let plan = null;
    let subscription = null;
    if (user.tenantId) {
      tenant = await saasModels.Tenant.findOne({ tenantId: user.tenantId });
      if (tenant) {
        // Enforce 3-day demo expiry check on /me
        if (tenant.accountType === 'DEMO' || tenant.demoExpiresAt) {
          const now = new Date();
          if (tenant.demoExpiresAt && now.getTime() >= new Date(tenant.demoExpiresAt).getTime()) {
            if (tenant.status !== 'EXPIRED') {
              tenant.status = 'EXPIRED';
              await tenant.save();
              await saasModels.DemoHistory.updateOne(
                { tenantId: tenant.tenantId },
                { status: 'EXPIRED', endedAt: now }
              );
            }
            res.status(401).json({
              success: false,
              error: 'Your 3-day demo has expired. Subscribe to continue using Orillusive HMS.',
              code: 'DEMO_EXPIRED',
            });
            return;
          }
        }
        plan = await saasModels.Plan.findOne({ planId: tenant.planId });
        subscription = await saasModels.Subscription.findOne({ tenantId: tenant.tenantId });
      }
    }

    res.json({
      success: true,
      data: {
        user,
        tenant,
        plan,
        subscription,
      },
    });
  } catch (err: any) {
    next(err);
  }
});

export default router;
