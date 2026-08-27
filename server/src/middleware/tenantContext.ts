import { Request, Response, NextFunction } from 'express';
import { getSaasModels } from '../db/saasDb.js';
import { getTenantDatabase } from '../db/tenantManager.js';

export async function requireTenantContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required before establishing tenant context.' });
      return;
    }

    // Super Admins can optionally specify a target tenant via header or query if accessing tenant operations
    let tenantId = req.user.tenantId;
    if (req.user.role === 'SUPER_ADMIN') {
      const headerTenant = req.headers['x-tenant-id'] as string;
      if (headerTenant) {
        tenantId = headerTenant;
      }
    }

    if (!tenantId) {
      res.status(400).json({ success: false, error: 'No tenant associated with user session.' });
      return;
    }

    const saasModels = getSaasModels();
    const tenant = await saasModels.Tenant.findOne({ tenantId });

    if (!tenant) {
      res.status(404).json({ success: false, error: 'Tenant profile not found or inactive.' });
      return;
    }

    if (tenant.status === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        error: 'Your account is not active. Tenant subscription has been suspended.',
        code: 'TENANT_SUSPENDED',
      });
      return;
    }

    // ─── Demo Expiration Check (72 Real Hours) ──────────────────────────────────
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

    // ─── Paid Subscription Expiration Check ──────────────────────────────────────
    if (tenant.accountType === 'PAID' && tenant.status === 'EXPIRED') {
      res.status(401).json({
        success: false,
        error: 'Your subscription has expired.',
        code: 'SUBSCRIPTION_EXPIRED',
      });
      return;
    }

    // Connect to dedicated tenant database and attach models
    const { connection, models } = await getTenantDatabase(tenantId);

    req.tenant = tenant;
    req.tenantDb = connection;
    req.tenantModels = models;
    req.saasModels = saasModels;

    next();
  } catch (error: any) {
    console.error('Tenant context initialization failed:', error);
    res.status(500).json({ success: false, error: 'Internal server error while resolving tenant database context.' });
  }
}
