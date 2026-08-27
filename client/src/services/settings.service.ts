import { api } from '@/lib/api';

export interface HotelSettingsData {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  city?: string;
  country?: string;
  currency: string;
  timezone: string;
  logoUrl?: string;
  ownerEmail: string;
  settings: {
    checkInTime: string;
    checkOutTime: string;
    defaultTaxRate: number;
    cancellationPolicy?: string;
    allowOnlineBooking: boolean;
  };
}

export const settingsService = {
  getSettings: () => api<HotelSettingsData>('/settings'),

  updateSettings: (data: Partial<HotelSettingsData> & Record<string, any>) =>
    api<HotelSettingsData>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
