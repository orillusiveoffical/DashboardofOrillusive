import { api } from '@/lib/api';

export interface StaffUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export const staffService = {
  getStaff: () => api<StaffUser[]>('/staff'),

  createStaff: (data: { email: string; password?: string; firstName: string; lastName: string; role: string; phone?: string }) =>
    api<StaffUser>('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
