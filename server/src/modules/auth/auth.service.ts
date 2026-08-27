import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { getSaasModels } from '../../db/saasDb.js';
import { getTenantDatabase, getTenantDbName } from '../../db/tenantManager.js';
import { normalizeEmail } from '../../utils/email.js';

export async function checkDemoEligibility(email: string) {
  const saasModels = getSaasModels();
  const normEmail = normalizeEmail(email);

  if (!normEmail) {
    return { eligible: false, message: 'Invalid email address.' };
  }

  const existingDemo = await saasModels.DemoHistory.findOne({ normalizedEmail: normEmail });
  if (existingDemo) {
    return {
      eligible: false,
      message: 'This email has already used its Orillusive HMS demo. Please choose a subscription plan to continue.',
    };
  }

  const existingUser = await saasModels.SaasUser.findOne({ normalizedEmail: normEmail });
  if (existingUser) {
    if (existingUser.accountType === 'DEMO') {
      return {
        eligible: false,
        message: 'This email has already used its Orillusive HMS demo. Please choose a subscription plan to continue.',
      };
    }
    return {
      eligible: false,
      message: 'An account with this email address already exists. Please log in to your account.',
    };
  }

  return { eligible: true };
}

export async function startDemo(payload: {
  hotelName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  city?: string;
  country?: string;
}) {
  const saasModels = getSaasModels();
  const normEmail = normalizeEmail(payload.email);

  if (!normEmail) {
    throw new Error('Please provide a valid email address.');
  }

  // 1. Persistent Check for Demo Eligibility (One Email = One Demo Ever)
  const eligibility = await checkDemoEligibility(normEmail);
  if (!eligibility.eligible) {
    throw new Error(eligibility.message);
  }

  // 2. Generate IDs & 72-Hour Server Timestamps (UTC)
  const tenantId = `tnt_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const userId = `usr_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const historyId = `hst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const demoStartedAt = new Date();
  // Exactly 72 real hours (3 real days elapsed time)
  const demoExpiresAt = new Date(demoStartedAt.getTime() + 72 * 60 * 60 * 1000);

  const passwordHash = await bcrypt.hash(payload.password, 10);

  // 3. Atomically Record Demo History to prevent race conditions
  try {
    await saasModels.DemoHistory.create({
      historyId,
      email: payload.email,
      normalizedEmail: normEmail,
      tenantId,
      userId,
      demoStartedAt,
      demoExpiresAt,
      status: 'ACTIVE',
    });
  } catch (err: any) {
    if (err.code === 11000 || err.message?.includes('duplicate')) {
      throw new Error('This email has already used its Orillusive HMS demo. Please choose a subscription plan to continue.');
    }
    throw err;
  }

  const baseSlug = payload.hotelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  let slug = `${baseSlug}-demo`;
  let counter = 1;
  while (await saasModels.Tenant.findOne({ slug })) {
    slug = `${baseSlug}-demo-${counter++}`;
  }
  const dbName = getTenantDbName(tenantId);

  // 4. Create SaaS Tenant record as DEMO
  const tenant = await saasModels.Tenant.create({
    tenantId,
    name: payload.hotelName,
    slug,
    dbName,
    status: 'ACTIVE',
    accountType: 'DEMO',
    demoStartedAt,
    demoExpiresAt,
    ownerEmail: payload.email,
    planId: 'MEDIUM', // 3-Day Full-featured demo
    phone: payload.phone,
    city: payload.city,
    country: payload.country || 'Pakistan',
  });

  // 5. Create Global SaaS User record
  const saasUser = await saasModels.SaasUser.create({
    userId,
    tenantId,
    email: payload.email,
    normalizedEmail: normEmail,
    accountType: 'DEMO',
    passwordHash,
    firstName: payload.firstName,
    lastName: payload.lastName,
    role: 'OWNER',
    phone: payload.phone,
    emailVerified: true,
  });

  // 6. Create Subscription record (TRIAL)
  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  await saasModels.Subscription.create({
    subscriptionId,
    tenantId,
    planId: 'MEDIUM',
    status: 'TRIAL',
    pricePkr: 0,
    currentPeriodStart: demoStartedAt,
    currentPeriodEnd: demoExpiresAt,
  });

  // 7. Provision dedicated Tenant Database
  const { models: tenantModels } = await getTenantDatabase(tenantId);

  await tenantModels.TenantUser.create({
    userId,
    email: payload.email,
    passwordHash,
    firstName: payload.firstName,
    lastName: payload.lastName,
    role: 'OWNER',
    phone: payload.phone,
  });

  // Seed default room types
  const defaultRoomTypes = [
    {
      typeId: `rt_deluxe_${Date.now()}`,
      name: 'Deluxe Room (Demo)',
      description: 'Spacious room with king bed and city view',
      basePrice: 15000,
      maxOccupancy: 2,
      beds: '1 King Bed',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Flat-screen TV', 'Mini Bar'],
    },
    {
      typeId: `rt_suite_${Date.now()}`,
      name: 'Executive Suite (Demo)',
      description: 'Luxury suite featuring lounge area and jacuzzi',
      basePrice: 35000,
      maxOccupancy: 4,
      beds: '1 King Bed + 1 Sofa Bed',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Jacuzzi', 'Breakfast Included'],
    },
  ];

  await tenantModels.RoomType.insertMany(defaultRoomTypes);

  await tenantModels.Room.insertMany([
    { roomId: `rm_101_${Date.now()}`, roomTypeId: defaultRoomTypes[0].typeId, number: '101', floor: 1, status: 'AVAILABLE' },
    { roomId: `rm_102_${Date.now()}`, roomTypeId: defaultRoomTypes[0].typeId, number: '102', floor: 1, status: 'AVAILABLE' },
    { roomId: `rm_201_${Date.now()}`, roomTypeId: defaultRoomTypes[1].typeId, number: '201', floor: 2, status: 'AVAILABLE' },
  ]);

  await tenantModels.TenantSettings.create({
    checkInTime: '14:00',
    checkOutTime: '12:00',
    defaultTaxRate: 16,
  });

  // Audit log
  await saasModels.PlatformAuditLog.create({
    logId: `log_${Date.now()}`,
    tenantId,
    userId,
    userEmail: payload.email,
    role: 'OWNER',
    action: 'DEMO_STARTED',
    resource: 'Tenant',
    details: { demoStartedAt, demoExpiresAt, hotelName: payload.hotelName },
  });

  // Sign JWT
  const token = jwt.sign(
    { userId: saasUser.userId, email: saasUser.email, role: saasUser.role, tenantId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as any
  );

  return {
    token,
    user: {
      userId: saasUser.userId,
      email: saasUser.email,
      firstName: saasUser.firstName,
      lastName: saasUser.lastName,
      role: saasUser.role,
      tenantId,
      accountType: 'DEMO',
    },
    tenant: {
      tenantId: tenant.tenantId,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      accountType: 'DEMO',
      planId: tenant.planId,
      demoStartedAt,
      demoExpiresAt,
    },
    message: 'Your 3-day demo has started.',
  };
}

export async function createPaidOrder(payload: {
  hotelName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  planId: 'BASIC' | 'MEDIUM' | 'PREMIUM';
  phone?: string;
  city?: string;
  country?: string;
}) {
  const saasModels = getSaasModels();
  const normEmail = normalizeEmail(payload.email);

  if (!normEmail) {
    throw new Error('Please provide a valid email address.');
  }

  // Verify planId exists
  const plan = await saasModels.Plan.findOne({ planId: payload.planId });
  if (!plan) {
    throw new Error('Selected subscription plan not found.');
  }

  // Check if owner email already exists as a paid user
  const existingUser = await saasModels.SaasUser.findOne({ normalizedEmail: normEmail });
  if (existingUser && existingUser.accountType === 'PAID') {
    throw new Error('An account with this email address already exists. Please log in.');
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Create PENDING Payment Order Record
  const order = await saasModels.PaymentOrder.create({
    orderId,
    paymentId,
    email: payload.email,
    normalizedEmail: normEmail,
    selectedPlan: payload.planId,
    amount: plan.pricePkr,
    currency: 'PKR',
    paymentStatus: 'PENDING',
    provider: 'MOCK_PAYMENT_GATEWAY',
    pendingRegistration: {
      hotelName: payload.hotelName,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      normalizedEmail: normEmail,
      passwordHash,
      planId: payload.planId,
      phone: payload.phone,
      city: payload.city,
      country: payload.country || 'Pakistan',
      existingUserId: existingUser ? existingUser.userId : undefined,
    },
  });

  return {
    orderId: order.orderId,
    paymentId: order.paymentId,
    selectedPlan: order.selectedPlan,
    amount: order.amount,
    currency: order.currency,
    paymentStatus: order.paymentStatus,
    message: 'Pending payment order created. Complete payment verification to activate account.',
  };
}

export async function verifyPaidPayment(payload: {
  orderId: string;
  paymentMethod?: string;
  cardHolder?: string;
  cardNumber?: string;
  expMonth?: string;
  expYear?: string;
  transactionRef?: string;
  simulateFailure?: boolean;
}) {
  const saasModels = getSaasModels();
  const order = await saasModels.PaymentOrder.findOne({ orderId: payload.orderId });

  if (!order) {
    throw new Error('Payment order record not found.');
  }

  if (order.paymentStatus !== 'PENDING') {
    if (order.paymentStatus === 'VERIFIED' && order.tenantId && order.userId) {
      // Order already verified and activated
      const user = await saasModels.SaasUser.findOne({ userId: order.userId });
      const tenant = await saasModels.Tenant.findOne({ tenantId: order.tenantId });
      if (user && tenant) {
        const token = jwt.sign(
          { userId: user.userId, email: user.email, role: user.role, tenantId: tenant.tenantId },
          config.jwt.secret,
          { expiresIn: config.jwt.expiresIn } as any
        );
        return {
          token,
          user: {
            userId: user.userId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: tenant.tenantId,
            accountType: 'PAID',
          },
          tenant: {
            tenantId: tenant.tenantId,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
            accountType: 'PAID',
            planId: tenant.planId,
          },
          message: 'Payment verified and account activated.',
        };
      }
    }
    throw new Error(`Order payment status is ${order.paymentStatus}. Cannot process activation.`);
  }

  // Server-Side Payment Verification logic
  if (payload.simulateFailure) {
    order.paymentStatus = 'FAILED';
    await order.save();
    throw new Error('Payment verification failed server-side. Card was declined or invalid transaction reference.');
  }

  // Mark order as VERIFIED
  const txnId = payload.transactionRef || `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  order.paymentStatus = 'VERIFIED';
  order.providerTransactionId = txnId;
  order.verifiedAt = new Date();

  const pending = order.pendingRegistration;
  if (!pending) {
    await order.save();
    throw new Error('Order missing registration data.');
  }

  const selectedPlanId = order.selectedPlan;
  const plan = await saasModels.Plan.findOne({ planId: selectedPlanId });
  if (!plan) {
    throw new Error('Selected plan does not exist.');
  }

  let tenantId = `tnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let userId = pending.existingUserId || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const baseSlug = pending.hotelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  let slug = baseSlug;
  let counter = 1;
  while (await saasModels.Tenant.findOne({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }
  const dbName = getTenantDbName(tenantId);

  // 1. Create Tenant (PAID)
  const tenant = await saasModels.Tenant.create({
    tenantId,
    name: pending.hotelName,
    slug,
    dbName,
    status: 'ACTIVE',
    accountType: 'PAID',
    ownerEmail: pending.email,
    planId: selectedPlanId,
    phone: pending.phone,
    city: pending.city,
    country: pending.country || 'Pakistan',
  });

  // 2. Create or Update SaaS User (PAID)
  let saasUser;
  if (pending.existingUserId) {
    saasUser = await saasModels.SaasUser.findOne({ userId: pending.existingUserId });
    if (saasUser) {
      saasUser.accountType = 'PAID';
      saasUser.tenantId = tenantId;
      saasUser.passwordHash = pending.passwordHash;
      await saasUser.save();
    }
  }

  if (!saasUser) {
    saasUser = await saasModels.SaasUser.create({
      userId,
      tenantId,
      email: pending.email,
      normalizedEmail: pending.normalizedEmail,
      accountType: 'PAID',
      passwordHash: pending.passwordHash,
      firstName: pending.firstName,
      lastName: pending.lastName,
      role: 'OWNER',
      phone: pending.phone,
      emailVerified: true,
    });
  }

  // 3. Create Subscription (ACTIVE)
  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  await saasModels.Subscription.create({
    subscriptionId,
    tenantId,
    planId: selectedPlanId,
    status: 'ACTIVE',
    pricePkr: plan.pricePkr,
    currentPeriodStart: startDate,
    currentPeriodEnd: endDate,
  });

  // Update order record with tenantId & userId
  order.tenantId = tenantId;
  order.userId = saasUser.userId;
  await order.save();

  // 4. Provision dedicated Tenant Database
  const { models: tenantModels } = await getTenantDatabase(tenantId);

  await tenantModels.TenantUser.create({
    userId: saasUser.userId,
    email: pending.email,
    passwordHash: pending.passwordHash,
    firstName: pending.firstName,
    lastName: pending.lastName,
    role: 'OWNER',
    phone: pending.phone,
  });

  const defaultRoomTypes = [
    {
      typeId: `rt_deluxe_${Date.now()}`,
      name: 'Deluxe Room',
      description: 'Spacious deluxe room with king bed and city view',
      basePrice: 15000,
      maxOccupancy: 2,
      beds: '1 King Bed',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Flat-screen TV', 'Mini Bar'],
    },
    {
      typeId: `rt_suite_${Date.now()}`,
      name: 'Executive Suite',
      description: 'Luxury suite featuring separate living lounge',
      basePrice: 35000,
      maxOccupancy: 4,
      beds: '1 King Bed + 1 Sofa Bed',
      amenities: ['Free Wi-Fi', 'Air Conditioning', 'Jacuzzi', 'Breakfast Included'],
    },
  ];

  await tenantModels.RoomType.insertMany(defaultRoomTypes);

  await tenantModels.Room.insertMany([
    { roomId: `rm_101_${Date.now()}`, roomTypeId: defaultRoomTypes[0].typeId, number: '101', floor: 1, status: 'AVAILABLE' },
    { roomId: `rm_102_${Date.now()}`, roomTypeId: defaultRoomTypes[0].typeId, number: '102', floor: 1, status: 'AVAILABLE' },
    { roomId: `rm_201_${Date.now()}`, roomTypeId: defaultRoomTypes[1].typeId, number: '201', floor: 2, status: 'AVAILABLE' },
  ]);

  await tenantModels.TenantSettings.create({
    checkInTime: '14:00',
    checkOutTime: '12:00',
    defaultTaxRate: 16,
  });

  await saasModels.PlatformAuditLog.create({
    logId: `log_${Date.now()}`,
    tenantId,
    userId: saasUser.userId,
    userEmail: pending.email,
    role: 'OWNER',
    action: 'TENANT_REGISTERED_PAID',
    resource: 'Tenant',
    details: { hotelName: pending.hotelName, planId: selectedPlanId, orderId: order.orderId, transactionId: txnId },
  });

  const token = jwt.sign(
    { userId: saasUser.userId, email: saasUser.email, role: saasUser.role, tenantId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as any
  );

  return {
    token,
    user: {
      userId: saasUser.userId,
      email: saasUser.email,
      firstName: saasUser.firstName,
      lastName: saasUser.lastName,
      role: saasUser.role,
      tenantId,
      accountType: 'PAID',
    },
    tenant: {
      tenantId: tenant.tenantId,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      accountType: 'PAID',
      planId: tenant.planId,
    },
    order: {
      orderId: order.orderId,
      providerTransactionId: order.providerTransactionId,
      status: order.paymentStatus,
    },
    message: 'Payment verified! Account created and activated.',
  };
}

export async function loginUser(payload: { email: string; password: string }) {
  const saasModels = getSaasModels();
  const normEmail = normalizeEmail(payload.email);

  if (!normEmail) {
    throw new Error('Email address is required.');
  }

  const user = await saasModels.SaasUser.findOne({ normalizedEmail: normEmail });

  if (!user || !user.isActive) {
    throw new Error('Invalid email or password.');
  }

  const isValidPassword = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password.');
  }

  let tenantObj = null;
  if (user.tenantId) {
    tenantObj = await saasModels.Tenant.findOne({ tenantId: user.tenantId });
  }

  if (tenantObj) {
    if (tenantObj.status === 'SUSPENDED') {
      const err: any = new Error('Your account is not active. Tenant subscription has been suspended.');
      err.code = 'TENANT_SUSPENDED';
      throw err;
    }

    // ─── 3-Day Demo Expiration Check (72 Real Hours) ──────────────────────────
    if (tenantObj.accountType === 'DEMO' || tenantObj.demoExpiresAt) {
      const now = new Date();
      if (tenantObj.demoExpiresAt && now.getTime() >= new Date(tenantObj.demoExpiresAt).getTime()) {
        if (tenantObj.status !== 'EXPIRED') {
          tenantObj.status = 'EXPIRED';
          await tenantObj.save();
          await saasModels.DemoHistory.updateOne(
            { tenantId: tenantObj.tenantId },
            { status: 'EXPIRED', endedAt: now }
          );
        }
        const err: any = new Error('Your 3-day demo has expired. Subscribe to continue using Orillusive HMS.');
        err.code = 'DEMO_EXPIRED';
        throw err;
      }
    }

    // ─── Paid Subscription Expiration Check ────────────────────────────────────
    if (tenantObj.accountType === 'PAID' && tenantObj.status === 'EXPIRED') {
      const err: any = new Error('Your subscription has expired.');
      err.code = 'SUBSCRIPTION_EXPIRED';
      throw err;
    }
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = jwt.sign(
    { userId: user.userId, email: user.email, role: user.role, tenantId: user.tenantId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as any
  );

  return {
    token,
    user: {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      accountType: user.accountType,
    },
    tenant: tenantObj
      ? {
          tenantId: tenantObj.tenantId,
          name: tenantObj.name,
          slug: tenantObj.slug,
          status: tenantObj.status,
          accountType: tenantObj.accountType,
          planId: tenantObj.planId,
          demoStartedAt: tenantObj.demoStartedAt,
          demoExpiresAt: tenantObj.demoExpiresAt,
        }
      : null,
  };
}

// Backward compatibility alias for legacy test runners
export async function registerTenant(payload: any) {
  const email = payload.email || payload.ownerEmail;
  const fullPayload = { ...payload, email };
  if (payload.planId === 'DEMO') {
    return startDemo(fullPayload);
  }
  // Otherwise, create order & immediately verify in test environments
  const orderRes = await createPaidOrder(fullPayload);
  return verifyPaidPayment({ orderId: orderRes.orderId });
}
