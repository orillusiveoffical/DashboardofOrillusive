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
}

export interface PaymentVerificationResult {
  transactionId: string;
  planName: string;
  planId: string;
  pricePkr: number;
  status: string;
}

export const subscriptionService = {
  getSubscription: () => api<SubscriptionStatus>('/subscription'),

  createCheckoutSession: (planId: string) =>
    api<CheckoutSession>('/subscription/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  verifyCheckout: (data: {
    sessionId: string;
    planId: string;
    cardHolder: string;
    cardNumber: string;
    expMonth: string;
    expYear: string;
    cvc: string;
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
