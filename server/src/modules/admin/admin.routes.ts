import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { getSaasModels } from '../../db/saasDb.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

// Platform-Wide Statistics
router.get('/stats', async (req, res, next) => {
  try {
    const saasModels = getSaasModels();
    const totalTenants = await saasModels.Tenant.countDocuments();
    const activeTenants = await saasModels.Tenant.countDocuments({ status: 'ACTIVE' });
    const suspendedTenants = await saasModels.Tenant.countDocuments({ status: 'SUSPENDED' });

    const plans = await saasModels.Plan.find();
    const planBreakdown = await Promise.all(
      plans.map(async (plan) => {
        const count = await saasModels.Tenant.countDocuments({ planId: plan.planId });
        return {
          planId: plan.planId,
          name: plan.name,
          pricePkr: plan.pricePkr,
          tenantCount: count,
          monthlyRevenuePkr: count * plan.pricePkr,
        };
      })
    );

    const totalRevenuePkr = planBreakdown.reduce((acc, curr) => acc + curr.monthlyRevenuePkr, 0);

    res.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        suspendedTenants,
        totalRevenuePkr,
        planBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
});

// List All Tenants
router.get('/tenants', async (req, res, next) => {
  try {
    const saasModels = getSaasModels();
    const tenants = await saasModels.Tenant.find().sort({ createdAt: -1 });
    const plans = await saasModels.Plan.find();
    const planMap = new Map(plans.map((p) => [p.planId, p]));

    const enriched = tenants.map((t) => {
      const plan = planMap.get(t.planId);
      return {
        ...t.toObject(),
        planName: plan?.name || t.planId,
        maxOtaChannels: plan?.maxOtaChannels ?? 0,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// Change Tenant Subscription Plan
router.patch('/tenants/:tenantId/plan', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { planId } = req.body;

    const saasModels = getSaasModels();
    const plan = await saasModels.Plan.findOne({ planId });

    if (!plan) {
      res.status(400).json({ success: false, error: 'Invalid plan ID provided.' });
      return;
    }

    const tenant = await saasModels.Tenant.findOneAndUpdate({ tenantId }, { planId }, { new: true });

    if (!tenant) {
      res.status(404).json({ success: false, error: 'Tenant not found.' });
      return;
    }

    // Update active subscription
    await saasModels.Subscription.updateOne(
      { tenantId, status: 'ACTIVE' },
      { planId, pricePkr: plan.pricePkr }
    );

    // Audit log
    await saasModels.PlatformAuditLog.create({
      logId: `log_${Date.now()}`,
      tenantId,
      userId: req.user!.userId,
      userEmail: req.user!.email,
      role: 'SUPER_ADMIN',
      action: 'TENANT_PLAN_CHANGED',
      resource: 'Tenant',
      details: { newPlanId: planId },
    });

    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
});

// Suspend or Activate Tenant
router.patch('/tenants/:tenantId/status', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'TRIAL', 'EXPIRED'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid tenant status.' });
      return;
    }

    const saasModels = getSaasModels();
    const tenant = await saasModels.Tenant.findOneAndUpdate({ tenantId }, { status }, { new: true });

    if (!tenant) {
      res.status(404).json({ success: false, error: 'Tenant not found.' });
      return;
    }

    await saasModels.PlatformAuditLog.create({
      logId: `log_${Date.now()}`,
      tenantId,
      userId: req.user!.userId,
      userEmail: req.user!.email,
      role: 'SUPER_ADMIN',
      action: 'TENANT_STATUS_CHANGED',
      resource: 'Tenant',
      details: { newStatus: status },
    });

    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
});

// List SaaS System Plans
router.get('/plans', async (req, res, next) => {
  try {
    const saasModels = getSaasModels();
    const plans = await saasModels.Plan.find();
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
});

// Platform Audit Logs
router.get('/logs', async (req, res, next) => {
  try {
    const saasModels = getSaasModels();
    const logs = await saasModels.PlatformAuditLog.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

export default router;
