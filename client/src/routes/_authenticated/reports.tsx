import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, PieChart, RefreshCw, BarChart3 } from 'lucide-react';
import { reportsService } from '@/services/reports.service';

export const Route = createFileRoute('/_authenticated/reports')({
  component: ReportsAnalyticsPage,
});

function ReportsAnalyticsPage() {
  const { data: analytics, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports-analytics'],
    queryFn: reportsService.getAnalytics,
    refetchInterval: 20000,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500 text-sm font-medium">Calculating operational analytics...</div>;
  }

  if (isError || !analytics) {
    return (
      <div className="p-10 text-center space-y-4 rounded-3xl bg-white border border-[#D2C4B4] shadow-sm text-[#0F172A]">
        <p className="text-base font-bold text-rose-600">Unable to load operational analytics.</p>
        <p className="text-xs text-slate-500">{(error as Error)?.message || 'Check server connection.'}</p>
        <button onClick={() => refetch()} className="px-5 py-2.5 rounded-xl bg-[#81A6C6] text-sm font-bold text-white shadow-sm">
          Retry Load
        </button>
      </div>
    );
  }

  const channelList = Array.isArray(analytics.channelPerformance) ? analytics.channelPerformance : [];

  return (
    <div className="space-y-8 text-[var(--text-primary)]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-[#81A6C6]" /> Operational & Financial Analytics
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
            Real-time reporting on occupancy rates, revenue metrics, cancellation statistics, and OTA distribution channels.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 h-11 px-5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] text-sm font-semibold shadow-sm transition active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4 text-[#81A6C6]" /> Refresh Data
        </button>
      </div>

      {/* Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm space-y-2 text-[var(--text-primary)]">
          <div className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Occupancy Rate</div>
          <div className="text-3xl font-extrabold text-[#81A6C6]">{analytics.occupancyRate ?? 0}%</div>
          <div className="text-xs text-[var(--text-secondary)] font-medium">
            {analytics.occupiedRooms ?? 0} / {analytics.totalRooms ?? 0} Rooms Occupied
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm space-y-2 text-[var(--text-primary)]">
          <div className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Total Revenue</div>
          <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
            {(analytics.totalRevenuePkr ?? 0).toLocaleString()} <span className="text-xs text-[var(--text-muted)] font-normal">{analytics.currency || 'PKR'}</span>
          </div>
          <div className="text-xs text-[var(--text-secondary)] font-medium">From {analytics.activeBookingsCount ?? 0} Active Bookings</div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm space-y-2 text-[var(--text-primary)]">
          <div className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Total Reservations</div>
          <div className="text-3xl font-extrabold text-[var(--text-primary)]">{analytics.totalBookings ?? 0}</div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">{analytics.activeBookingsCount ?? 0} Confirmed Stays</div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm space-y-2 text-[var(--text-primary)]">
          <div className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Cancelled Bookings</div>
          <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">{analytics.cancelledBookingsCount ?? 0}</div>
          <div className="text-xs text-[var(--text-secondary)] font-medium">
            Cancellation Rate: {(analytics.totalBookings ?? 0) > 0 ? Math.round(((analytics.cancelledBookingsCount ?? 0) / analytics.totalBookings) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Channel Distribution Performance Card */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 shadow-sm space-y-5 text-[var(--text-primary)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2.5">
          <PieChart className="w-5 h-5 text-[#81A6C6]" /> Channel Distribution Performance
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          {channelList.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)] font-medium">No channel performance data recorded.</div>
          ) : (
            <table className="w-full text-left text-xs text-[var(--text-primary)] border-collapse">
              <thead className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold uppercase tracking-wider text-[11px] border-b border-[var(--border)]">
                <tr>
                  <th className="p-3.5">Booking Channel</th>
                  <th className="p-3.5">Total Bookings</th>
                  <th className="p-3.5">Generated Revenue</th>
                  <th className="p-3.5">Market Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-medium">
                {channelList.map((ch: any) => (
                  <tr key={ch.source} className="hover:bg-[var(--bg-surface)] transition">
                    <td className="p-3.5 font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#81A6C6]" /> {ch.source}
                    </td>
                    <td className="p-3.5 text-[var(--text-primary)] font-semibold">{ch.bookingsCount} Reservations</td>
                    <td className="p-3.5 font-mono text-emerald-700 dark:text-emerald-400 font-extrabold">
                      {(ch.totalRevenue || 0).toLocaleString()} {analytics.currency || 'PKR'}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-[var(--bg-surface)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                          <div className="bg-[#81A6C6] h-full" style={{ width: `${ch.sharePercentage || 0}%` }} />
                        </div>
                        <span className="font-bold text-[#81A6C6]">{ch.sharePercentage || 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
