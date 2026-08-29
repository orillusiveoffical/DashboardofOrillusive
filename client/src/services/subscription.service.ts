import { api } from '@/lib/api';

export interface PlanDetail {
  planId: string;
  name: string;
  pricePkr: number;
  maxOtaChannels: number;
  features: string[];
}

export interface SubscriptionStatus {
  tenantId: string;
  hotelName: string;
  currentPlan: PlanDetail;
  subscription: {
    status: string;
    currentPeriodEnd: string;
  };
  otaUsage: {
    activeConnections: number;
    maxAllowed: number;
  };
  availablePlans: PlanDetail[];
}

export interface CheckoutSession {
  sessionId: string;
  orderId?: string;
  trackerToken?: string;
  planId: string;
  planName: string;
  pricePkr: number;
  taxAmountPkr: number;
  totalPkr: number;
  maxOtaChannels: number;
  currency: string;
  tenantId: string;
  hotelName: string;
  customerEmail: string;
  checkoutUrl: string;
  safepayCheckoutUrl?: string;
  environment?: string;
}

export interface PaymentVerificationResult {
  transactionId: string;
  orderId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  planName: string;
  planId: string;
  pricePkr: number;
  totalPkr?: number;
  status: string;
}

export interface Invoice {
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
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  createdAt: string;
}

export const subscriptionService = {
  getSubscription: () => api<SubscriptionStatus>('/subscription'),

  getInvoices: () => api<Invoice[]>('/subscription/invoices'),

  getInvoiceById: (invoiceId: string) => api<Invoice>(`/subscription/invoices/${invoiceId}`),

  createCheckoutSession: (planId: string) =>
    api<CheckoutSession>('/subscription/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  verifyCheckout: (data: {
    sessionId?: string;
    orderId?: string;
    planId?: string;
    trackerToken?: string;
    cardHolder?: string;
    cardNumber?: string;
    expMonth?: string;
    expYear?: string;
    cvc?: string;
  }) =>
    api<PaymentVerificationResult>('/subscription/verify-checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  upgradePlan: (planId: string) =>
    api<{ success: boolean; message: string }>('/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),
};
