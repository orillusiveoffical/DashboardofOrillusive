import { Request, Response, NextFunction } from 'express';
import { getSaasModels } from '../db/saasDb.js';

export function requireOtaSlot() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenant || !req.tenantModels) {
        res.status(400).json({ success: false, error: 'Tenant context missing.' });
        return;
      }

      const saasModels = getSaasModels();
      const plan = await saasModels.Plan.findOne({ planId: req.tenant.planId });

      if (!plan) {
        res.status(403).json({ success: false, error: 'Invalid subscription plan associated with tenant.' });
        return;
      }

      const maxChannels = plan.maxOtaChannels;

      if (maxChannels === 0) {
        res.status(403).json({
          success: false,
          error: `OTA channel integrations are NOT available on the ${plan.name} (5,000 PKR/mo). Please upgrade to Medium or Premium plan.`,
          code: 'OTA_PLAN_LIMIT_REACHED',
          currentPlan: plan.planId,
          maxAllowed: 0,
        });
        return;
      }

      if (maxChannels > 0) {
        const currentActiveConnections = await req.tenantModels.ChannelConnection.countDocuments({
          status: { $ne: 'DISCONNECTED' },
        });

        if (currentActiveConnections >= maxChannels) {
          res.status(403).json({
            success: false,
            error: `Your current ${plan.name} allows maximum ${maxChannels} active OTA channel integration(s). Upgrade to Premium for unlimited OTA channels.`,
            code: 'OTA_PLAN_LIMIT_EXCEEDED',
            currentPlan: plan.planId,
            currentConnections: currentActiveConnections,
            maxAllowed: maxChannels,
          });
          return;
        }
      }

      next();
    } catch (error: any) {
      console.error('Error in subscription guard middleware:', error);
      res.status(500).json({ success: false, error: 'Internal server error validating subscription limits.' });
    }
  };
}
