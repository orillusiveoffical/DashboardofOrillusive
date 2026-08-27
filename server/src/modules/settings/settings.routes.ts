import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';
import { requireRole } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);

router.get('/', async (req, res, next) => {
  try {
    const tenant = req.tenant!;
    let settings = await req.tenantModels!.TenantSettings.findOne();

    if (!settings) {
      settings = await req.tenantModels!.TenantSettings.create({
        checkInTime: '14:00',
        checkOutTime: '12:00',
        defaultTaxRate: 16,
      });
    }

    res.json({
      success: true,
      data: {
        id: tenant.tenantId,
        name: tenant.name,
        slug: tenant.slug,
        phone: tenant.phone,
        city: tenant.city,
        country: tenant.country,
        currency: tenant.currency,
        timezone: tenant.timezone,
        logoUrl: tenant.logoUrl,
        ownerEmail: tenant.ownerEmail,
        settings,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/', requireRole('OWNER', 'MANAGER'), async (req, res, next) => {
  try {
    const { name, phone, city, country, currency, timezone, logoUrl, checkInTime, checkOutTime, defaultTaxRate, cancellationPolicy } = req.body;

    const tenant = req.tenant!;
    if (name) tenant.name = name;
    if (phone) tenant.phone = phone;
    if (city) tenant.city = city;
    if (country) tenant.country = country;
    if (currency) tenant.currency = currency;
    if (timezone) tenant.timezone = timezone;
    if (logoUrl) tenant.logoUrl = logoUrl;
    await tenant.save();

    const settings = await req.tenantModels!.TenantSettings.findOneAndUpdate(
      {},
      {
        ...(checkInTime && { checkInTime }),
        ...(checkOutTime && { checkOutTime }),
        ...(defaultTaxRate !== undefined && { defaultTaxRate: Number(defaultTaxRate) }),
        ...(cancellationPolicy && { cancellationPolicy }),
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: {
        id: tenant.tenantId,
        name: tenant.name,
        slug: tenant.slug,
        phone: tenant.phone,
        city: tenant.city,
        country: tenant.country,
        currency: tenant.currency,
        timezone: tenant.timezone,
        settings,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
