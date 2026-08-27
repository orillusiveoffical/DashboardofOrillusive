import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, RefreshCw, CheckCircle2 } from 'lucide-react';
import { notificationsService, SystemNotification } from '@/services/notifications.service';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/notifications')({
  component: NotificationCenterPage,
});

function NotificationCenterPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsService.getNotifications,
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifList: SystemNotification[] = Array.isArray(notifications)
    ? notifications
    : Array.isArray((notifications as any)?.items)
    ? (notifications as any).items
    : [];

  const unreadCount = notifList.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-8 text-[var(--text-primary)]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
              <Bell className="w-8 h-8 text-[#81A6C6]" /> Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-[#81A6C6] text-white text-xs font-bold shadow-xs">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
            System notifications, direct website booking alerts, OTA channel synchronization events, and subscription alerts.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 h-11 px-5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] text-sm font-semibold shadow-sm transition active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4 text-[#81A6C6]" /> Refresh Feed
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-10 text-center space-y-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm text-[var(--text-primary)]">
          <p className="text-base font-bold text-rose-600">Failed to load system notifications.</p>
          <p className="text-xs text-[var(--text-muted)]">{(error as Error)?.message || 'Check server connection.'}</p>
          <button onClick={() => refetch()} className="px-5 py-2.5 rounded-xl bg-[#81A6C6] text-sm font-bold text-white shadow-sm">
            Retry Load
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-w-4xl">
          {notifList.length > 0 ? (
            notifList.map((n: SystemNotification) => {
              const isUnread = !n.isRead;
              return (
                <div
                  key={n.notificationId || (n as any).id}
                  className={cn(
                    'p-5 rounded-2xl border flex items-start justify-between gap-4 transition-all duration-200 shadow-sm text-[var(--text-primary)]',
                    isUnread
                      ? 'border-[#81A6C6] bg-[var(--bg-card)] ring-1 ring-[#81A6C6]/20'
                      : 'border-[var(--border)] bg-[var(--bg-surface)] opacity-80'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-[#81A6C6]/20 text-[#81A6C6] shrink-0 border border-[#81A6C6]/30">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-base text-[var(--text-primary)] tracking-tight">{n.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">{n.message}</p>
                      <span className="text-[11px] font-mono text-[var(--text-muted)] mt-2 block font-medium">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      onClick={() => markReadMutation.mutate(n.notificationId || (n as any).id)}
                      disabled={markReadMutation.isPending}
                      className="flex items-center gap-1 text-xs font-bold text-[#81A6C6] hover:underline shrink-0 bg-[#81A6C6]/15 px-3 py-1.5 rounded-xl border border-[#81A6C6]/30"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Read
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center space-y-2 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] text-sm font-medium">
              No new notifications available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
