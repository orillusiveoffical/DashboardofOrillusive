import { api } from '@/lib/api';
import type { User, HotelDetails, HotelSettings } from '@/types';

export interface SaaSStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalRevenuePkr: number;
  planBreakdown: {
    planId: string;
    name: string;
    pricePkr: number;
    tenantCount: number;
    monthlyRevenuePkr: number;
  }[];
}

export interface TenantRecord {
  tenantId: string;
  name: string;
  slug: string;
  dbName: string;
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
  ownerEmail: string;
  planId: string;
  planName: string;
  maxOtaChannels: number;
  phone?: string;
  city?: string;
  country?: string;
  createdAt: string;
}

export interface SaaSPlan {
  planId: string;
  name: string;
  pricePkr: number;
  maxOtaChannels: number;
  features: string[];
}

export interface PlatformAuditLog {
  logId: string;
  tenantId?: string;
  userId: string;
  userEmail: string;
  role: string;
  action: string;
  resource: string;
  createdAt: string;
}

export const adminService = {
  // SaaS Super Admin Endpoints
  getStats: () => api<SaaSStats>('/admin/stats'),

  getTenants: () => api<TenantRecord[]>('/admin/tenants'),

  updateTenantPlan: (tenantId: string, planId: string) =>
    api<TenantRecord>(`/admin/tenants/${tenantId}/plan`, {
      method: 'PATCH',
      body: JSON.stringify({ planId }),
    }),

  updateTenantStatus: (tenantId: string, status: string) =>
    api<TenantRecord>(`/admin/tenants/${tenantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getPlans: () => api<SaaSPlan[]>('/admin/plans'),

  getLogs: () => api<PlatformAuditLog[]>('/admin/logs'),

  // Tenant Admin Endpoints (Users & Settings)
  getHotel: () => api<HotelDetails>('/admin/settings'),
  getSettings: () => api<HotelSettings & HotelDetails>('/admin/settings'),

  updateHotel: (data: Partial<HotelDetails>) =>
    api<HotelDetails>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateSettings: (data: Partial<HotelSettings & HotelDetails>) =>
    api<HotelSettings>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getUsers: () => api<User[]>('/admin/users'),

  createUser: (data: { email: string; firstName: string; lastName: string; role: string; password?: string }) =>
    api<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteUser: (userId: string) =>
    api<{ success: boolean }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    }),
};
