import { Connection } from 'mongoose';
import { ITenant } from '../models/saas/schemas.js';
import { SaasModels } from '../db/saasDb.js';
import { TenantModels } from '../db/tenantManager.js';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'STAFF';
  tenantId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenant?: ITenant;
      tenantDb?: Connection;
      tenantModels?: TenantModels;
      saasModels?: SaasModels;
    }
  }
}
