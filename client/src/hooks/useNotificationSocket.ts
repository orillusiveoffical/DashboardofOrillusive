import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type?: string;
  timestamp: Date;
}

export function useNotificationSocket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  useEffect(() => {
    let envApi = (import.meta as any).env?.VITE_API_URL;
    let socketUrl: string;
    if (envApi && typeof envApi === 'string' && envApi.trim() !== '') {
      let url = envApi.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
        url = `https://${url}`;
      }
      socketUrl = url.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    } else if (
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      socketUrl = 'https://dashboardof-orillusive-server.vercel.app';
    } else {
      socketUrl = window.location.origin;
    }

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      const tenantId = (user as any)?.tenantId || 'tnt_demo_grand';
      newSocket.emit('join_tenant_room', tenantId);
    });

    newSocket.on('new_notification', (data: any) => {
      const newToast: ToastAlert = {
        id: data.notificationId || `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: data.title || 'New Event Notification',
        message: data.message || 'A system event was recorded.',
        type: data.type || 'SYSTEM',
        timestamp: new Date(),
      };

      // Add toast alert overlay
      setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

      // Invalidate relevant query caches
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    });

    newSocket.on('calendar_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    });

    newSocket.on('room_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
    });

    newSocket.on('ota_sync_status', () => {
      queryClient.invalidateQueries({ queryKey: ['ota-connections'] });
      queryClient.invalidateQueries({ queryKey: ['ota-logs'] });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, queryClient]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { socket, toasts, dismissToast };
}
