import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';
import { requireRole } from '../../middleware/rbac.js';
import { getSaasModels } from '../../db/saasDb.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);

router.get('/', async (req, res, next) => {
  try {
    const staffMembers = await req.tenantModels!.TenantUser.find().select('-passwordHash');
    res.json({ success: true, data: staffMembers });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('OWNER', 'MANAGER'), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role = 'STAFF', phone } = req.body;
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ success: false, error: 'Email, password, first name, and last name are required.' });
      return;
    }

    const saasModels = getSaasModels();
    const existingGlobal = await saasModels.SaasUser.findOne({ email: email.toLowerCase() });
    if (existingGlobal) {
      res.status(400).json({ success: false, error: 'A user account with this email address already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Create in global SaaS users
    await saasModels.SaasUser.create({
      userId,
      tenantId: req.tenant!.tenantId,
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role,
      phone,
    });

    // Create in tenant users
    const staffUser = await req.tenantModels!.TenantUser.create({
      userId,
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role,
      phone,
    });

    const safeObj = staffUser.toObject();
    delete (safeObj as any).passwordHash;

    res.status(201).json({ success: true, data: safeObj });
  } catch (err) {
    next(err);
  }
});

export default router;
