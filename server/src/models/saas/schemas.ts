import mongoose, { Schema, Document } from 'mongoose';

// ─── Tenant Schema ────────────────────────────────────────────────────────────
export interface ITenant extends Document {
  tenantId: string;
  name: string;
  slug: string;
  dbName: string;
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
  accountType: 'DEMO' | 'PAID';
  demoStartedAt?: Date;
  demoExpiresAt?: Date;
  ownerEmail: string;
  planId: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone: string;
  currency: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    tenantId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    dbName: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'SUSPENDED'],
      default: 'TRIAL',
    },
    accountType: {
      type: String,
      enum: ['DEMO', 'PAID'],
      default: 'PAID',
    },
    demoStartedAt: Date,
    demoExpiresAt: Date,
    ownerEmail: { type: String, required: true },
    planId: { type: String, required: true, default: 'BASIC' },
    phone: String,
    address: String,
    city: String,
    country: String,
    timezone: { type: String, default: 'Asia/Karachi' },
    currency: { type: String, default: 'PKR' },
    logoUrl: String,
  },
  { timestamps: true }
);

// ─── Plan Schema ──────────────────────────────────────────────────────────────
export interface IPlan extends Document {
  planId: string;
  name: string;
  pricePkr: number;
  maxOtaChannels: number; // 0 for BASIC, 2 for MEDIUM, -1 for unlimited PREMIUM
  features: string[];
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    planId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    pricePkr: { type: Number, required: true },
    maxOtaChannels: { type: Number, required: true }, // 0, 2, or -1 (unlimited)
    features: [{ type: String }],
    isCustom: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Global SaaS User Schema ──────────────────────────────────────────────────
export interface ISaasUser extends Document {
  userId: string;
  tenantId?: string;
  email: string;
  normalizedEmail: string;
  accountType: 'DEMO' | 'PAID';
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'STAFF';
  phone?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SaasUserSchema = new Schema<ISaasUser>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, index: true },
    email: { type: String, required: true },
    normalizedEmail: { type: String, required: true, unique: true, index: true },
    accountType: { type: String, enum: ['DEMO', 'PAID'], default: 'PAID' },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'STAFF'],
      default: 'STAFF',
    },
    phone: String,
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

// ─── Demo History Schema ──────────────────────────────────────────────────────
export interface IDemoHistory extends Document {
  historyId: string;
  email: string;
  normalizedEmail: string;
  tenantId: string;
  userId: string;
  demoStartedAt: Date;
  demoExpiresAt: Date;
  status: 'ACTIVE' | 'EXPIRED';
  createdAt: Date;
  endedAt?: Date;
}

const DemoHistorySchema = new Schema<IDemoHistory>(
  {
    historyId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    normalizedEmail: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    demoStartedAt: { type: Date, required: true },
    demoExpiresAt: { type: Date, required: true },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED'], default: 'ACTIVE' },
    endedAt: Date,
  },
  { timestamps: true }
);

// ─── Payment Order Schema ─────────────────────────────────────────────────────
export interface IPaymentOrder extends Document {
  orderId: string;
  paymentId: string;
  tenantId?: string;
  userId?: string;
  email: string;
  normalizedEmail: string;
  selectedPlan: 'BASIC' | 'MEDIUM' | 'PREMIUM';
  amount: number;
  currency: string;
  paymentStatus:
    | 'PENDING'
    | 'PROCESSING'
    | 'PAID'
    | 'VERIFIED'
    | 'FAILED'
    | 'DECLINED'
    | 'CANCELLED'
    | 'REFUNDED'
    | 'EXPIRED';
  provider: string;
  providerTransactionId?: string;
  providerReference?: string;
  invoiceId?: string;
  pendingRegistration?: Record<string, any>;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentOrderSchema = new Schema<IPaymentOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, index: true },
    userId: { type: String, index: true },
    email: { type: String, required: true },
    normalizedEmail: { type: String, required: true, index: true },
    selectedPlan: { type: String, enum: ['BASIC', 'MEDIUM', 'PREMIUM'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'PKR' },
    paymentStatus: {
      type: String,
      enum: [
        'PENDING',
        'PROCESSING',
        'PAID',
        'VERIFIED',
        'FAILED',
        'DECLINED',
        'CANCELLED',
        'REFUNDED',
        'EXPIRED',
      ],
      default: 'PENDING',
    },
    provider: { type: String, default: 'safepay' },
    providerTransactionId: { type: String, index: true },
    providerReference: { type: String, index: true },
    invoiceId: { type: String, index: true },
    pendingRegistration: Schema.Types.Mixed,
    verifiedAt: Date,
  },
  { timestamps: true }
);

// ─── Invoice Schema ───────────────────────────────────────────────────────────
export interface IInvoice extends Document {
  invoiceId: string;
  invoiceNumber: string;
  orderId: string;
  tenantId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  hotelName: string;
  planId: string;
  planName: string;
  description: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: 'PAID' | 'VOID' | 'REFUNDED';
  paymentProvider: string;
  providerTransactionId: string;
  providerReference?: string;
  periodStart: Date;
  periodEnd: Date;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceId: { type: String, required: true, unique: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    hotelName: { type: String, required: true },
    planId: { type: String, required: true },
    planName: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'PKR' },
    status: { type: String, enum: ['PAID', 'VOID', 'REFUNDED'], default: 'PAID' },
    paymentProvider: { type: String, default: 'safepay' },
    providerTransactionId: { type: String, required: true },
    providerReference: String,
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    paidAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// ─── Subscription Schema ──────────────────────────────────────────────────────
export interface ISubscription extends Document {
  subscriptionId: string;
  tenantId: string;
  planId: string;
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
  pricePkr: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    subscriptionId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    planId: { type: String, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'SUSPENDED'],
      default: 'ACTIVE',
    },
    pricePkr: { type: Number, required: true },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Platform Audit Log Schema ───────────────────────────────────────────────
export interface IPlatformAuditLog extends Document {
  logId: string;
  tenantId?: string;
  userId: string;
  userEmail: string;
  role: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const PlatformAuditLogSchema = new Schema<IPlatformAuditLog>(
  {
    logId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, index: true },
    userId: { type: String, required: true },
    userEmail: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    details: Schema.Types.Mixed,
    ipAddress: String,
  },
  { timestamps: true }
);

export {
  TenantSchema,
  PlanSchema,
  SaasUserSchema,
  DemoHistorySchema,
  PaymentOrderSchema,
  InvoiceSchema,
  SubscriptionSchema,
  PlatformAuditLogSchema,
};

