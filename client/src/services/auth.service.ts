import { api, setToken, clearToken } from '@/lib/api';

export interface UserProfile {
  id?: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId?: string;
  accountType?: 'DEMO' | 'PAID';
  hotel?: { id?: string; name?: string; slug?: string; currency?: string };
}

export interface TenantProfile {
  tenantId: string;
  name: string;
  slug: string;
  status: string;
  accountType: 'DEMO' | 'PAID';
  planId: string;
  demoStartedAt?: string;
  demoExpiresAt?: string;
}

export interface AuthResponseData {
  token: string;
  user: UserProfile;
  tenant: TenantProfile | null;
  accountType?: 'DEMO' | 'PAID';
  demoExpiresAt?: string;
  message?: string;
}

export interface PaymentOrderData {
  orderId: string;
  paymentId: string;
  selectedPlan: 'BASIC' | 'MEDIUM' | 'PREMIUM';
  amount: number;
  currency: string;
  paymentStatus: string;
  message?: string;
}

export const authService = {
  checkDemoEligibility: (email: string) =>
    api<{ eligible: boolean; message?: string }>(`/auth/check-demo-eligibility?email=${encodeURIComponent(email)}`),

  startDemo: (data: {
    hotelName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    city?: string;
    country?: string;
  }) =>
    api<AuthResponseData>('/auth/start-demo', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((res) => {
      setToken(res.token);
      return res;
    }),

  createPaidOrder: (data: {
    hotelName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    planId: 'BASIC' | 'MEDIUM' | 'PREMIUM';
    phone?: string;
    city?: string;
    country?: string;
  }) =>
    api<PaymentOrderData>('/auth/create-paid-order', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyPaidPayment: (data: {
    orderId: string;
    cardHolder?: string;
    cardNumber?: string;
    expMonth?: string;
    expYear?: string;
    transactionRef?: string;
    simulateFailure?: boolean;
  }) =>
    api<AuthResponseData>('/auth/verify-paid-payment', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((res) => {
      setToken(res.token);
      return res;
    }),

  login: (email: string, password: string) =>
    api<AuthResponseData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then((data) => {
      setToken(data.token);
      return data;
    }),

  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    hotelName: string;
    phone?: string;
    planId?: string;
  }) =>
    api<AuthResponseData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((res) => {
      setToken(res.token);
      return res;
    }),

  me: () =>
    api<{
      user: UserProfile;
      tenant: TenantProfile | null;
      plan: any;
      subscription: any;
    }>('/auth/me'),

  logout: () => {
    clearToken();
  },
};
