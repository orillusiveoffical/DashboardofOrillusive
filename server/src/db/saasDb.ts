import mongoose, { Connection, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import {
  ITenant,
  TenantSchema,
  IPlan,
  PlanSchema,
  ISaasUser,
  SaasUserSchema,
  IDemoHistory,
  DemoHistorySchema,
  IPaymentOrder,
  PaymentOrderSchema,
  ISubscription,
  SubscriptionSchema,
  IPlatformAuditLog,
  PlatformAuditLogSchema,
} from '../models/saas/schemas.js';
import { getTenantDatabase } from './tenantManager.js';

let saasConnection: Connection | null = null;

export interface SaasModels {
  Tenant: Model<ITenant>;
  Plan: Model<IPlan>;
  SaasUser: Model<ISaasUser>;
  DemoHistory: Model<IDemoHistory>;
  PaymentOrder: Model<IPaymentOrder>;
  Subscription: Model<ISubscription>;
  PlatformAuditLog: Model<IPlatformAuditLog>;
}

let saasModels: SaasModels | null = null;

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

export async function connectSaasDb(): Promise<{ connection: Connection; models: SaasModels }> {
  if (saasConnection && saasModels) {
    return { connection: saasConnection, models: saasModels };
  }

  const saasDbUri = buildMongoUri(config.mongoDbUri, config.centralDbName);

  console.log(`Connecting to Central SaaS Database: ${config.centralDbName}...`);

  saasConnection = await mongoose.createConnection(saasDbUri).asPromise();

  saasModels = {
    Tenant: saasConnection.model<ITenant>('Tenant', TenantSchema, 'tenants'),
    Plan: saasConnection.model<IPlan>('Plan', PlanSchema, 'plans'),
    SaasUser: saasConnection.model<ISaasUser>('SaasUser', SaasUserSchema, 'users'),
    DemoHistory: saasConnection.model<IDemoHistory>('DemoHistory', DemoHistorySchema, 'demo_histories'),
    PaymentOrder: saasConnection.model<IPaymentOrder>('PaymentOrder', PaymentOrderSchema, 'payment_orders'),
    Subscription: saasConnection.model<ISubscription>('Subscription', SubscriptionSchema, 'subscriptions'),
    PlatformAuditLog: saasConnection.model<IPlatformAuditLog>(
      'PlatformAuditLog',
      PlatformAuditLogSchema,
      'platformAuditLogs'
    ),
  };

  await seedDefaultPlans(saasModels.Plan);
  await seedDemoAccounts(saasModels);

  console.log('Central SaaS Database connected & seeded successfully.');
  return { connection: saasConnection, models: saasModels };
}

export function getSaasModels(): SaasModels {
  if (!saasModels) {
    throw new Error('SaaS Database not initialized. Call connectSaasDb() first.');
  }
  return saasModels;
}

export function getSaasConnection(): Connection {
  if (!saasConnection) {
    throw new Error('SaaS Database connection not established.');
  }
  return saasConnection;
}

async function seedDefaultPlans(PlanModel: Model<IPlan>): Promise<void> {
  const existingCount = await PlanModel.countDocuments();
  if (existingCount > 0) return;

  const defaultPlans = [
    {
      planId: 'BASIC',
      name: 'Basic Plan',
      pricePkr: 5000,
      maxOtaChannels: 0,
      features: [
        'Full Hotel Management System',
        'Room & Room Type Management',
        'Guest Profiles & History',
        'Booking & Reservation Engine',
        'Central Interactive Calendar',
        'Staff Roles & Permissions',
        'Basic Reports (Occupancy, Revenue)',
      ],
      isCustom: false,
    },
    {
      planId: 'MEDIUM',
      name: 'Medium Plan',
      pricePkr: 12000,
      maxOtaChannels: 2,
      features: [
        'Everything in Basic Plan',
        'Max 2 OTA Integrations (Booking.com, Airbnb, Expedia, Agoda)',
        'Automated Room Mapping',
        'Real-time OTA Inventory Sync',
        'Channel Performance Reports',
      ],
      isCustom: false,
    },
    {
      planId: 'PREMIUM',
      name: 'Premium Plan',
      pricePkr: 15000,
      maxOtaChannels: -1,
      features: [
        'Everything in Medium Plan',
        'Unlimited Supported OTA Integrations',
        'Priority OTA Synchronization Queue',
        'Advanced Analytics & Revenue Intelligence',
        'Direct Website Booking Engine Integration',
        '24/7 Dedicated Support',
      ],
      isCustom: false,
    },
  ];

  await PlanModel.insertMany(defaultPlans);
  console.log('Default SaaS plans seeded.');
}

async function seedDemoAccounts(models: SaasModels): Promise<void> {
  // Do NOT seed demo/test accounts in production environments
  if (config.nodeEnv === 'production' || process.env.NODE_ENV === 'production') {
    console.log('Production environment detected. Skipping demo account seeding.');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Super Admin
  const adminEmail = 'admin@orillusive.com';
  const existingAdmin = await models.SaasUser.findOne({
    $or: [{ email: adminEmail }, { normalizedEmail: adminEmail }, { userId: 'usr_super_admin_demo' }],
  });
  if (!existingAdmin) {
    await models.SaasUser.create({
      userId: 'usr_super_admin_demo',
      email: adminEmail,
      normalizedEmail: adminEmail,
      accountType: 'PAID',
      passwordHash,
      firstName: 'System',
      lastName: 'SuperAdmin',
      role: 'SUPER_ADMIN',
      emailVerified: true,
    });
    console.log('✓ Demo Super Admin seeded: admin@orillusive.com / password123');
  } else if (!existingAdmin.normalizedEmail || !existingAdmin.accountType) {
    existingAdmin.normalizedEmail = adminEmail;
    existingAdmin.accountType = 'PAID';
    await existingAdmin.save();
  }

  // 2. Seed Demo Hotel Tenant & Owner
  const ownerEmail = 'owner@orillusive.com';
  const tenantId = 'tnt_demo_grand';
  const existingTenant = await models.Tenant.findOne({ tenantId });

  if (!existingTenant) {
    await models.Tenant.create({
      tenantId,
      name: 'Orillusive Grand Hotel',
      slug: 'orillusive-grand-hotel',
      dbName: 'hms_tenant_tnt_demo_grand',
      status: 'ACTIVE',
      accountType: 'PAID',
      ownerEmail,
      planId: 'MEDIUM', // Allows 2 OTAs
      phone: '+92 300 9876543',
      city: 'Islamabad',
      country: 'Pakistan',
    });

    await models.SaasUser.create({
      userId: 'usr_owner_demo',
      tenantId,
      email: ownerEmail,
      normalizedEmail: ownerEmail,
      accountType: 'PAID',
      passwordHash,
      firstName: 'Tariq',
      lastName: 'Mahmood',
      role: 'OWNER',
      emailVerified: true,
    });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    await models.Subscription.create({
      subscriptionId: 'sub_demo_grand',
      tenantId,
      planId: 'MEDIUM',
      status: 'ACTIVE',
      pricePkr: 12000,
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
    });

    // Provision dedicated Tenant Database and seed demo operational data
    const { models: tenantModels } = await getTenantDatabase(tenantId);

    await tenantModels.TenantUser.create({
      userId: 'usr_owner_demo',
      email: ownerEmail,
      passwordHash,
      firstName: 'Tariq',
      lastName: 'Mahmood',
      role: 'OWNER',
    });

    const rt1 = await tenantModels.RoomType.create({
      typeId: 'rt_deluxe_demo',
      name: 'Deluxe City View',
      description: 'Spacious room with king bed and city views',
      basePrice: 14000,
      maxOccupancy: 2,
      beds: '1 King Bed',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Flat-screen TV', 'Mini Bar'],
    });

    const rt2 = await tenantModels.RoomType.create({
      typeId: 'rt_suite_demo',
      name: 'Presidential Suite',
      description: 'Luxury suite featuring lounge area and jacuzzi',
      basePrice: 32000,
      maxOccupancy: 4,
      beds: '1 King Bed + 1 Queen Bed',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Jacuzzi', 'Breakfast Included'],
    });

    const room101 = await tenantModels.Room.create({
      roomId: 'rm_101_demo',
      roomTypeId: rt1.typeId,
      number: '101',
      floor: 1,
      status: 'OCCUPIED',
    });

    const room102 = await tenantModels.Room.create({
      roomId: 'rm_102_demo',
      roomTypeId: rt1.typeId,
      number: '102',
      floor: 1,
      status: 'AVAILABLE',
    });

    const room201 = await tenantModels.Room.create({
      roomId: 'rm_201_demo',
      roomTypeId: rt2.typeId,
      number: '201',
      floor: 2,
      status: 'AVAILABLE',
    });

    const guest1 = await tenantModels.Guest.create({
      guestId: 'gst_demo_1',
      firstName: 'Hamza',
      lastName: 'Ali',
      email: 'hamza@example.com',
      phone: '+92 321 4455667',
      country: 'Pakistan',
    });

    const checkIn = new Date();
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 3);

    await tenantModels.Booking.create({
      bookingId: 'bk_demo_1',
      bookingNumber: 'BK-100889',
      guestId: guest1.guestId,
      roomId: room101.roomId,
      roomTypeId: rt1.typeId,
      checkIn,
      checkOut,
      adults: 2,
      children: 0,
      status: 'CHECKED_IN',
      source: 'DIRECT',
      totalAmount: 42000,
      paidAmount: 42000,
      paymentStatus: 'COMPLETED',
    });

    console.log('✓ Demo Tenant "Orillusive Grand Hotel" & operational data seeded successfully.');
  }
}
