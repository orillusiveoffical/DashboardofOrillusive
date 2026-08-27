import mongoose, { Connection, Model } from 'mongoose';
import { config } from '../config/index.js';
import {
  ITenantUser, TenantUserSchema,
  IRoomType, RoomTypeSchema,
  IRoom, RoomSchema,
  IGuest, GuestSchema,
  IBooking, BookingSchema,
  IChannelConnection, ChannelConnectionSchema,
  IRoomMapping, RoomMappingSchema,
  ITenantSettings, TenantSettingsSchema,
  ITenantAuditLog, TenantAuditLogSchema,
  ISyncLog, SyncLogSchema,
  IHousekeeping, HousekeepingSchema,
  INotification, NotificationSchema,
} from '../models/tenant/schemas.js';

export interface TenantModels {
  TenantUser: Model<ITenantUser>;
  RoomType: Model<IRoomType>;
  Room: Model<IRoom>;
  Guest: Model<IGuest>;
  Booking: Model<IBooking>;
  ChannelConnection: Model<IChannelConnection>;
  RoomMapping: Model<IRoomMapping>;
  TenantSettings: Model<ITenantSettings>;
  TenantAuditLog: Model<ITenantAuditLog>;
  SyncLog: Model<ISyncLog>;
  Housekeeping: Model<IHousekeeping>;
  Notification: Model<INotification>;
}

// In-memory cache of tenant database connections and models
const connectionCache = new Map<string, { connection: Connection; models: TenantModels }>();

export function getTenantDbName(tenantId: string): string {
  const cleanId = tenantId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return `hms_tenant_${cleanId}`;
}

function buildMongoUri(baseUri: string, dbName: string): string {
  if (!baseUri) return '';
  let query = '';
  let uriWithoutQuery = baseUri.trim();

  if (uriWithoutQuery.includes('?')) {
    const qIndex = uriWithoutQuery.indexOf('?');
    query = uriWithoutQuery.substring(qIndex + 1);
    uriWithoutQuery = uriWithoutQuery.substring(0, qIndex);
  }

  uriWithoutQuery = uriWithoutQuery.replace(/\/+$/, '');

  const schemeMatch = uriWithoutQuery.match(/^(mongodb(?:\+srv)?:\/\/[^\/]+)/i);
  if (schemeMatch) {
    const hostPart = schemeMatch[1];
    return query ? `${hostPart}/${dbName}?${query}` : `${hostPart}/${dbName}`;
  }

  return query ? `${uriWithoutQuery}/${dbName}?${query}` : `${uriWithoutQuery}/${dbName}`;
}

export async function getTenantDatabase(tenantId: string): Promise<{ connection: Connection; models: TenantModels }> {
  if (connectionCache.has(tenantId)) {
    return connectionCache.get(tenantId)!;
  }

  const dbName = getTenantDbName(tenantId);
  const tenantUri = buildMongoUri(config.mongoDbUri, dbName);

  const connection = await mongoose.createConnection(tenantUri).asPromise();

  const models: TenantModels = {
    TenantUser: connection.model<ITenantUser>('TenantUser', TenantUserSchema, 'users'),
    RoomType: connection.model<IRoomType>('RoomType', RoomTypeSchema, 'roomTypes'),
    Room: connection.model<IRoom>('Room', RoomSchema, 'rooms'),
    Guest: connection.model<IGuest>('Guest', GuestSchema, 'guests'),
    Booking: connection.model<IBooking>('Booking', BookingSchema, 'bookings'),
    ChannelConnection: connection.model<IChannelConnection>('ChannelConnection', ChannelConnectionSchema, 'channelConnections'),
    RoomMapping: connection.model<IRoomMapping>('RoomMapping', RoomMappingSchema, 'roomMappings'),
    TenantSettings: connection.model<ITenantSettings>('TenantSettings', TenantSettingsSchema, 'settings'),
    TenantAuditLog: connection.model<ITenantAuditLog>('TenantAuditLog', TenantAuditLogSchema, 'auditLogs'),
    SyncLog: connection.model<ISyncLog>('SyncLog', SyncLogSchema, 'syncLogs'),
    Housekeeping: connection.model<IHousekeeping>('Housekeeping', HousekeepingSchema, 'housekeeping'),
    Notification: connection.model<INotification>('Notification', NotificationSchema, 'notifications'),
  };

  connectionCache.set(tenantId, { connection, models });
  return { connection, models };
}

export async function closeTenantDatabase(tenantId: string): Promise<void> {
  const entry = connectionCache.get(tenantId);
  if (entry) {
    await entry.connection.close();
    connectionCache.delete(tenantId);
  }
}
