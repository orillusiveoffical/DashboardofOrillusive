import { api } from '@/lib/api';

export interface ChannelConnection {
  connectionId: string;
  channelId: 'BOOKING_COM' | 'AIRBNB' | 'EXPEDIA' | 'AGODA';
  name: string;
  status: 'CONNECTED' | 'CONNECTING' | 'SYNCING' | 'FAILED' | 'DISCONNECTED';
  propertyId?: string;
  lastSyncedAt?: string;
  lastSyncStatus?: 'SUCCESS' | 'FAILED';
  lastSyncError?: string;
  autoSync: boolean;
}

export interface PlanCapabilities {
  planId: string;
  planName: string;
  maxOtaChannels: number;
  activeCount: number;
}

export interface RoomMapping {
  mappingId: string;
  connectionId: string;
  hmsRoomTypeId: string;
  otaRoomTypeId: string;
  otaRoomName: string;
  otaRatePlanId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
}

export interface SyncLog {
  logId: string;
  channelId: string;
  eventType: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRYING';
  payloadSummary?: string;
  errorReason?: string;
  createdAt: string;
}

export const otaService = {
  getConnections: () =>
    api<{ connections: ChannelConnection[]; planCapabilities: PlanCapabilities }>('/integrations/connections'),

  connectChannel: (data: { channelId: string; name: string; propertyId: string; credentials: Record<string, any> }) =>
    api<ChannelConnection>('/integrations/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRoomMappings: () => api<RoomMapping[]>('/integrations/room-mappings'),

  createRoomMapping: (data: { connectionId: string; hmsRoomTypeId: string; otaRoomTypeId: string; otaRoomName?: string }) =>
    api<RoomMapping>('/integrations/room-mappings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  triggerSyncNow: () =>
    api<{ success: boolean; message: string }>('/integrations/sync-now', {
      method: 'POST',
    }),

  getSyncLogs: () => api<SyncLog[]>('/integrations/logs'),
};
