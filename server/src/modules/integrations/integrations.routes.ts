import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenantContext } from '../../middleware/tenantContext.js';
import { requireRole } from '../../middleware/rbac.js';
import { requireOtaSlot } from '../../middleware/subscriptionGuard.js';
import { channelManagerService } from '../../services/ota/ChannelManagerService.js';
import { getTenantDatabase } from '../../db/tenantManager.js';
import { getSaasModels } from '../../db/saasDb.js';
import { maskSecret } from '../../utils/crypto.js';

const router = Router();

// ─── Webhook Receiver Endpoint (PUBLIC) ──────────────────────────────────────
router.post('/webhook/:tenantId/:channelId', async (req, res) => {
  try {
    const { tenantId, channelId } = req.params;
    const payload = req.body;

    const { models: tenantModels } = await getTenantDatabase(tenantId);
    const provider = channelManagerService.getProvider(channelId.toUpperCase());

    if (!provider) {
      res.status(400).json({ success: false, error: 'Unknown channel provider' });
      return;
    }

    const signature = req.headers['x-ota-signature'] as string;
    if (!provider.verifyWebhookSignature(payload, signature)) {
      res.status(401).json({ success: false, error: 'Invalid webhook signature' });
      return;
    }

    // Process OTA reservation payload with idempotency
    const result = await channelManagerService.processOtaReservation(tenantModels, tenantId, payload);
    res.json(result);
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Authenticated Channel Management Endpoints
router.use(authenticate);
router.use(requireTenantContext);

// List Channel Connections
router.get('/connections', async (req, res, next) => {
  try {
    const connections = await req.tenantModels!.ChannelConnection.find();

    const saasModels = getSaasModels();
    const plan = await saasModels.Plan.findOne({ planId: req.tenant!.planId });

    // Mask secret keys before returning to client
    const safeConnections = connections.map((conn) => {
      const obj = conn.toObject();
      delete (obj as any).credentials;
      return {
        ...obj,
        credentialsMasked: true,
      };
    });

    res.json({
      success: true,
      data: {
        connections: safeConnections,
        planCapabilities: {
          planId: plan?.planId,
          planName: plan?.name,
          maxOtaChannels: plan?.maxOtaChannels,
          activeCount: connections.filter((c) => c.status !== 'DISCONNECTED').length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Connect OTA Channel (ENFORCES BACKEND SUBSCRIPTION PLAN LIMITS)
router.post('/connect', requireRole('OWNER', 'MANAGER'), requireOtaSlot(), async (req, res, next) => {
  try {
    const { channelId, name, propertyId, credentials } = req.body;
    if (!channelId || !credentials) {
      res.status(400).json({ success: false, error: 'Channel ID and credentials are required.' });
      return;
    }

    const connection = await channelManagerService.connectChannel(
      req.tenantModels!,
      channelId,
      name,
      propertyId || 'PROP-1001',
      credentials
    );

    res.status(201).json({
      success: true,
      data: {
        connectionId: connection.connectionId,
        channelId: connection.channelId,
        name: connection.name,
        status: connection.status,
        propertyId: connection.propertyId,
        lastSyncedAt: connection.lastSyncedAt,
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Room Mapping endpoints
router.get('/room-mappings', async (req, res, next) => {
  try {
    const mappings = await req.tenantModels!.RoomMapping.find();
    res.json({ success: true, data: mappings });
  } catch (err) {
    next(err);
  }
});

router.post('/room-mappings', requireRole('OWNER', 'MANAGER'), async (req, res, next) => {
  try {
    const { connectionId, hmsRoomTypeId, otaRoomTypeId, otaRoomName } = req.body;
    if (!connectionId || !hmsRoomTypeId || !otaRoomTypeId) {
      res.status(400).json({ success: false, error: 'Connection ID, HMS room type ID, and OTA room type ID are required.' });
      return;
    }

    const mappingId = `map_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const mapping = await req.tenantModels!.RoomMapping.create({
      mappingId,
      connectionId,
      hmsRoomTypeId,
      otaRoomTypeId,
      otaRoomName: otaRoomName || 'OTA Deluxe Room',
      status: 'ACTIVE',
    });

    res.status(201).json({ success: true, data: mapping });
  } catch (err) {
    next(err);
  }
});

// Trigger Manual Inventory Sync
router.post('/sync-now', requireRole('OWNER', 'MANAGER'), async (req, res, next) => {
  try {
    await channelManagerService.syncTenantInventoryToChannels(req.tenantModels!, req.tenant!.tenantId);
    res.json({ success: true, message: 'Inventory synchronization pushed to all connected channels.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get OTA Sync Audit Logs
router.get('/logs', async (req, res, next) => {
  try {
    const logs = await req.tenantModels!.SyncLog.find().sort({ createdAt: -1 }).limit(30);
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

export default router;
