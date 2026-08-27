import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  TrendingUp,
  BedDouble,
  DollarSign,
  LogIn,
  LogOut,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';
import { StatusBadge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { formatCurrency, formatShortDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardService.getStats,
    refetchInterval: 20000,
  });

  if (isLoading) return <PageLoader />;

  if (error || !stats) {
    return (
      <div className="p-10 text-center space-y-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm text-[var(--text-primary)]">
        <p className="text-base font-bold text-rose-600">Unable to load dashboard statistics.</p>
        <p className="text-xs text-[var(--text-muted)]">Please ensure your server and database connection are active.</p>
      </div>
    );
  }

  const currency = user?.hotel?.currency ?? 'PKR';
  const hotelName = user?.hotel?.name ?? 'Orillusive Grand Hotel';

  const recentBookings = stats.recentBookings ?? [];
  const upcomingCheckIns = stats.upcomingCheckIns ?? [];
  const upcomingCheckOuts = stats.upcomingCheckOuts ?? [];

  return (
    <div className="space-y-8 text-[var(--text-primary)]">
      {/* Top Welcome Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-[#81A6C6]" /> Operational Dashboard
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">Welcome back to {hotelName}</p>
        </div>

        <Link
          to="/bookings"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] text-xs font-bold shadow-xs transition"
        >
          <span>View All Reservations</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#81A6C6]" />
        </Link>
      </div>

      {/* 4 Top KPI Metric Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm flex flex-col justify-between h-44 transition hover:border-[#81A6C6]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Bookings</span>
            <div className="p-2.5 rounded-2xl bg-[#81A6C6]/20 text-[#81A6C6] border border-[#81A6C6]/30">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[var(--text-primary)]">{stats.totalBookings ?? 0}</div>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-1">{stats.activeBookings ?? 0} Active Reservations</p>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm flex flex-col justify-between h-44 transition hover:border-[#81A6C6]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Occupancy Rate</span>
            <div className="p-2.5 rounded-2xl bg-[#81A6C6]/20 text-[#81A6C6] border border-[#81A6C6]/30">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#81A6C6]">{stats.occupancyRate ?? 0}%</div>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-1">
              {stats.occupiedRooms ?? 0} / {stats.totalRooms ?? 0} Rooms Occupied
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm flex flex-col justify-between h-44 transition hover:border-[#81A6C6]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Monthly Revenue</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(stats.monthlyRevenue ?? 0, currency)}
            </div>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Current Calendar Month</p>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm flex flex-col justify-between h-44 transition hover:border-[#81A6C6]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Revenue</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[var(--text-primary)]">
              {formatCurrency(stats.totalRevenue ?? 0, currency)}
            </div>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Cumulative Generated Income</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Bookings & Feeds */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Bookings Table Card */}
        <div className="lg:col-span-2 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 shadow-sm space-y-4 text-[var(--text-primary)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Recent Bookings Activity</h2>
            <Link to="/bookings" className="text-xs font-bold text-[#81A6C6] hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            {recentBookings.length === 0 ? (
              <p className="p-8 text-xs text-[var(--text-muted)] text-center font-medium">No recent bookings recorded yet.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold uppercase tracking-wider">
                    <th className="p-3.5">Guest Profile</th>
                    <th className="p-3.5">Room</th>
                    <th className="p-3.5">Dates</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {recentBookings.map((bk: any) => {
                    const gName = bk.guestName || (bk.guest ? `${bk.guest.firstName} ${bk.guest.lastName}` : 'Guest');
                    const rNum = bk.roomNumber || bk.room?.number || 'Unassigned';

                    return (
                      <tr key={bk.id || bk.bookingId} className="hover:bg-[var(--bg-surface)] transition">
                        <td className="p-3.5 font-bold text-[var(--text-primary)]">{gName}</td>
                        <td className="p-3.5 font-semibold text-[#81A6C6]">Room {rNum}</td>
                        <td className="p-3.5 text-[var(--text-secondary)] font-mono">
                          {formatShortDate(bk.checkIn)} → {formatShortDate(bk.checkOut)}
                        </td>
                        <td className="p-3.5 font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                          {formatCurrency(bk.totalAmount, currency)}
                        </td>
                        <td className="p-3.5">
                          <StatusBadge status={bk.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Operational Side Feeds */}
        <div className="space-y-6">
          {/* Upcoming Check-Ins */}
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm space-y-4 text-[var(--text-primary)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <LogIn className="w-4 h-4 text-[#81A6C6]" /> Upcoming Arrivals
              </h3>
              <span className="text-xs font-bold text-[#81A6C6] bg-[#81A6C6]/15 px-2.5 py-0.5 rounded-full">
                {upcomingCheckIns.length}
              </span>
            </div>

            {upcomingCheckIns.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No check-ins scheduled for today.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingCheckIns.map((bk: any) => (
                  <div
                    key={bk.id || bk.bookingId}
                    className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">
                        {bk.guestName || (bk.guest ? `${bk.guest.firstName} ${bk.guest.lastName}` : 'Guest')}
                      </p>
                      <p className="text-[10px] text-[#81A6C6] font-semibold">
                        Room {bk.roomNumber || bk.room?.number || '101'}
                      </p>
                    </div>
                    <StatusBadge status={bk.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Check-Outs */}
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm space-y-4 text-[var(--text-primary)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Expected Departures
              </h3>
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-500/15 px-2.5 py-0.5 rounded-full">
                {upcomingCheckOuts.length}
              </span>
            </div>

            {upcomingCheckOuts.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No check-outs scheduled for today.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingCheckOuts.map((bk: any) => (
                  <div
                    key={bk.id || bk.bookingId}
                    className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">
                        {bk.guestName || (bk.guest ? `${bk.guest.firstName} ${bk.guest.lastName}` : 'Guest')}
                      </p>
                      <p className="text-[10px] text-[#81A6C6] font-semibold">
                        Room {bk.roomNumber || bk.room?.number || '101'}
                      </p>
                    </div>
                    <StatusBadge status={bk.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
