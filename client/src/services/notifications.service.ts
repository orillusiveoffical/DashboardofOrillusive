import { api } from '@/lib/api';

export interface SystemNotification {
  notificationId: string;
  title: string;
  message: string;
  type: 'BOOKING' | 'CANCELLATION' | 'OTA_SYNC' | 'SUBSCRIPTION' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
}

export const notificationsService = {
  getNotifications: () => api<SystemNotification[]>('/notifications'),

  markAsRead: (notificationId: string) =>
    api<{ success: boolean }>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    }),
};
