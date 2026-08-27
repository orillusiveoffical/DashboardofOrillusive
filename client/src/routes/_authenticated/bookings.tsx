import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Plus,
  LogIn,
  LogOut,
  XCircle,
  Search,
  BookOpen,
  Calendar,
  BedDouble,
  Globe,
  Eye,
} from 'lucide-react';
import { bookingsService } from '@/services/bookings.service';
import { guestsService } from '@/services/guests.service';
import { roomsService } from '@/services/rooms.service';
import { Textarea } from '@/components/ui/Form';
import { formatCurrency, formatShortDate, cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { Booking, BookingStatus } from '@/types';

export const Route = createFileRoute('/_authenticated/bookings')({
  component: BookingsPage,
});

const STATUS_TABS = [
  { id: '', label: 'All Bookings' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'CHECKED_IN', label: 'Checked In' },
  { id: 'CHECKED_OUT', label: 'Checked Out' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

function BookingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['bookings', statusFilter],
    queryFn: () => bookingsService.getAll(statusFilter ? { status: statusFilter } : undefined),
    refetchInterval: 15000,
  });

  const checkInMutation = useMutation({
    mutationFn: bookingsService.checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: bookingsService.checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  const rawList: any[] = Array.isArray(data) ? data : Array.isArray((data as any)?.items) ? (data as any).items : [];

  // Filter list by search query and date
  const filteredBookings = rawList.filter((b) => {
    const guestName = (b.guestName || (b.guest ? `${b.guest.firstName} ${b.guest.lastName}` : '')).toLowerCase();
    const guestEmail = (b.guestEmail || b.guest?.email || '').toLowerCase();
    const bookingNum = (b.bookingNumber || b.bookingId || '').toLowerCase();
    const roomNum = (b.roomNumber || b.room?.number || '').toString().toLowerCase();

    const matchesSearch =
      !searchQuery ||
      guestName.includes(searchQuery.toLowerCase()) ||
      guestEmail.includes(searchQuery.toLowerCase()) ||
      bookingNum.includes(searchQuery.toLowerCase()) ||
      roomNum.includes(searchQuery.toLowerCase());

    const matchesDate = !dateFilter || (b.checkIn && b.checkIn.startsWith(dateFilter));

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#D2C4B4] pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1E293B] flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-[#81A6C6]" /> Bookings & Reservations
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Real-time multi-channel reservation control, guest stay timelines & check-in management.
          </p>
        </div>

        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white shadow-sm transition duration-150"
        >
          <Plus className="w-4 h-4" /> Create Reservation
        </button>
      </div>

      {/* Control Bar: Search & Status Tabs */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-white border border-[#D2C4B4] p-1 rounded-xl overflow-x-auto scrollbar-none shadow-sm">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition duration-150',
                  isActive
                    ? 'bg-[#81A6C6] text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-[#1E293B] hover:bg-[#FAF5EF]'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Date Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#D2C4B4] text-xs max-w-xs w-full shadow-sm">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search guest, booking #, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-[#1E293B] placeholder-slate-400 focus:outline-none w-full font-medium"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#D2C4B4] text-xs text-slate-600 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-[#1E293B] focus:outline-none font-mono"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="text-slate-400 hover:text-[#1E293B] text-xs font-bold">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dense Data Table */}
      <div className="rounded-2xl border border-[#D2C4B4] bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-[#FAF5EF] animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-rose-600">Unable to load reservation list.</p>
            <p className="text-xs text-slate-500">{(error as Error)?.message || 'Check network connection.'}</p>
            <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-[#81A6C6] text-xs font-bold text-white">Retry</button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF5EF] text-slate-500 flex items-center justify-center mx-auto border border-[#D2C4B4]">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1E293B]">No Reservations Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              No booking records match the selected status tabs or search criteria.
            </p>
            <button
              onClick={() => setCreateModal(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#81A6C6] text-xs font-bold text-white shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Create New Reservation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAF5EF] border-b border-[#D2C4B4] text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Booking ID</th>
                  <th className="p-3.5">Guest Info</th>
                  <th className="p-3.5">Room & Type</th>
                  <th className="p-3.5">Stay Period & Duration</th>
                  <th className="p-3.5">Source</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D2C4B4]/60">
                {filteredBookings.map((b) => (
                  <BookingTableRow
                    key={b.bookingId || b.id}
                    booking={b}
                    currency={user?.hotel?.currency ?? 'PKR'}
                    onCheckIn={() => checkInMutation.mutate(b.bookingId || b.id)}
                    onCheckOut={() => checkOutMutation.mutate(b.bookingId || b.id)}
                    onCancel={() => cancelMutation.mutate(b.bookingId || b.id)}
                    onView={() => setSelectedBookingDetails(b)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBookingDetails && (
        <BookingDetailsModal
          booking={selectedBookingDetails}
          currency={user?.hotel?.currency ?? 'PKR'}
          onClose={() => setSelectedBookingDetails(null)}
        />
      )}

      {/* Create Reservation Modal */}
      {createModal && <CreateBookingModal open={createModal} onClose={() => setCreateModal(false)} />}
    </div>
  );
}

// ─── Table Row Component ──────────────────────────────────────────────────────
function BookingTableRow({
  booking,
  currency,
  onCheckIn,
  onCheckOut,
  onCancel,
  onView,
}: {
  booking: any;
  currency: string;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onCancel: () => void;
  onView: () => void;
}) {
  const guestName = booking.guestName || (booking.guest ? `${booking.guest.firstName} ${booking.guest.lastName}` : 'Guest');
  const guestEmail = booking.guestEmail || booking.guest?.email || 'N/A';
  const roomNum = booking.roomNumber || booking.room?.number || 'N/A';
  const roomType = booking.roomTypeName || booking.roomType?.name || booking.room?.roomType?.name || 'Standard';

  const checkInDate = new Date(booking.checkIn);
  const checkOutDate = new Date(booking.checkOut);
  const nightsCount = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24)));

  const sourceStr = booking.externalSource || booking.source || 'DIRECT';
  const isOta = sourceStr === 'OTA' || ['BOOKING_COM', 'AIRBNB', 'AGODA', 'EXPEDIA'].includes(sourceStr);

  const status = booking.status || 'CONFIRMED';
  const paymentStatus = booking.paymentStatus || (booking.paidAmount >= booking.totalAmount ? 'COMPLETED' : booking.paidAmount > 0 ? 'PARTIAL' : 'PENDING');

  return (
    <tr className="hover:bg-[#FAF5EF]/80 transition duration-150">
      {/* Booking ID */}
      <td className="p-3.5 font-mono text-[#81A6C6] font-extrabold">
        {booking.bookingNumber || booking.bookingId}
      </td>

      {/* Guest Name & Contact */}
      <td className="p-3.5">
        <div className="font-extrabold text-[#1E293B]">{guestName}</div>
        <div className="text-[10px] text-slate-500 font-medium">{guestEmail}</div>
      </td>

      {/* Room # & Type */}
      <td className="p-3.5">
        <div className="font-extrabold text-[#1E293B] flex items-center gap-1.5">
          <BedDouble className="w-3.5 h-3.5 text-[#81A6C6]" />
          <span>Room {roomNum}</span>
        </div>
        <div className="text-[10px] text-slate-500 font-medium">{roomType}</div>
      </td>

      {/* Stay Period & Duration */}
      <td className="p-3.5 whitespace-nowrap">
        <div className="font-semibold text-[#1E293B]">
          {formatShortDate(booking.checkIn)} → {formatShortDate(booking.checkOut)}
        </div>
        <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-md bg-[#AACDDC]/30 text-[#1E293B] font-bold border border-[#81A6C6]/30">
          {nightsCount} {nightsCount === 1 ? 'night' : 'nights'}
        </span>
      </td>

      {/* Source */}
      <td className="p-3.5 whitespace-nowrap">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border',
            isOta
              ? 'bg-[#AACDDC]/30 text-[#1E293B] border-[#81A6C6]/40'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          )}
        >
          <Globe className="w-3 h-3" /> {sourceStr}
        </span>
      </td>

      {/* Payment Status */}
      <td className="p-3.5 whitespace-nowrap">
        <div className="font-extrabold text-[#1E293B]">{formatCurrency(booking.totalAmount, currency)}</div>
        <span
          className={cn(
            'inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border',
            paymentStatus === 'COMPLETED'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : paymentStatus === 'PARTIAL'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          )}
        >
          {paymentStatus}
        </span>
      </td>

      {/* Reservation Status with Dot Indicator */}
      <td className="p-3.5 whitespace-nowrap">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
            status === 'CHECKED_IN'
              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
              : status === 'CONFIRMED'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : status === 'CHECKED_OUT'
              ? 'bg-slate-100 text-slate-700 border-slate-300'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              status === 'CHECKED_IN'
                ? 'bg-indigo-600'
                : status === 'CONFIRMED'
                ? 'bg-emerald-600'
                : status === 'CHECKED_OUT'
                ? 'bg-slate-500'
                : 'bg-rose-600'
            )}
          />
          {status}
        </span>
      </td>

      {/* Quick Actions */}
      <td className="p-3.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="p-1.5 rounded-lg bg-[#FAF5EF] hover:bg-[#AACDDC]/30 text-[#0F172A] border border-[#D2C4B4] transition cursor-pointer"
            title="View Booking Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {(status === 'CONFIRMED' || status === 'PENDING') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCheckIn();
              }}
              className="px-2.5 py-1 rounded-lg bg-[#81A6C6] hover:bg-[#6C93B5] text-white text-xs font-bold transition shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <LogIn className="w-3 h-3" /> Check In
            </button>
          )}

          {status === 'CHECKED_IN' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCheckOut();
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" /> Check Out
            </button>
          )}

          {['CONFIRMED', 'PENDING'].includes(status) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to cancel this reservation and release the room inventory?')) {
                  onCancel();
                }
              }}
              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
              title="Cancel Reservation"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Booking Details Modal ───────────────────────────────────────────────────
function BookingDetailsModal({
  booking,
  currency,
  onClose,
}: {
  booking: any;
  currency: string;
  onClose: () => void;
}) {
  const guestName =
    booking.guestName ||
    (booking.guest ? `${booking.guest.firstName} ${booking.guest.lastName}` : 'Guest');

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#D2C4B4] rounded-3xl max-w-md w-full p-7 shadow-2xl space-y-5 text-[#0F172A]">
        <div className="flex items-center justify-between border-b border-[#D2C4B4] pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#81A6C6]" /> Reservation Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ref: <span className="font-mono text-[#81A6C6] font-extrabold">{booking.bookingNumber || booking.bookingId || booking.id}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1 text-slate-400 hover:bg-[#AACDDC]/30 hover:text-[#0F172A] transition">
            ✕
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between p-3 rounded-xl bg-[#FAF5EF] border border-[#D2C4B4]/60">
            <span className="text-slate-500 font-medium">Guest Name:</span>
            <span className="font-bold text-[#0F172A]">{guestName}</span>
          </div>
          <div className="flex justify-between p-3 rounded-xl bg-[#FAF5EF] border border-[#D2C4B4]/60">
            <span className="text-slate-500 font-medium">Room Number:</span>
            <span className="font-bold text-[#81A6C6]">Room {booking.roomNumber || booking.room?.number || '101'}</span>
          </div>
          <div className="flex justify-between p-3 rounded-xl bg-[#FAF5EF] border border-[#D2C4B4]/60">
            <span className="text-slate-500 font-medium">Stay Dates:</span>
            <span className="font-mono text-slate-800 font-semibold">{formatShortDate(booking.checkIn)} → {formatShortDate(booking.checkOut)}</span>
          </div>
          <div className="flex justify-between p-3 rounded-xl bg-[#FAF5EF] border border-[#D2C4B4]/60">
            <span className="text-slate-500 font-medium">Booking Source:</span>
            <span className="font-bold text-[#0F172A]">{booking.externalSource || booking.source || 'DIRECT'}</span>
          </div>
          <div className="flex justify-between p-3 rounded-xl bg-[#FAF5EF] border border-[#D2C4B4]/60">
            <span className="text-slate-500 font-medium">Total Amount:</span>
            <span className="font-extrabold text-emerald-800 text-sm">{formatCurrency(booking.totalAmount, currency)}</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button onClick={onClose} className="w-full h-11 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-xs transition shadow-sm active:scale-[0.98]">
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Booking Modal ─────────────────────────────────────────────────────
function CreateBookingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    guestId: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    adults: '1',
    children: '0',
    totalAmount: '',
    specialRequests: '',
    status: 'CONFIRMED' as BookingStatus,
  });

  const { data: guests } = useQuery({ queryKey: ['guests'], queryFn: () => guestsService.getAll({ limit: '100' }), enabled: open });
  const { data: rooms } = useQuery({ queryKey: ['rooms'], queryFn: () => roomsService.getAll({ limit: '100' }), enabled: open });

  const guestsList = Array.isArray(guests) ? guests : Array.isArray((guests as any)?.items) ? (guests as any).items : [];
  const roomsList = Array.isArray(rooms) ? rooms : Array.isArray((rooms as any)?.items) ? (rooms as any).items : [];

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.guestId || !form.roomId) {
        throw new Error('Please select both a guest and a room.');
      }
      if (!form.checkIn || !form.checkOut) {
        throw new Error('Please select both check-in and check-out dates.');
      }
      if (new Date(form.checkIn) >= new Date(form.checkOut)) {
        throw new Error('Check-out date must be after check-in date.');
      }
      return bookingsService.create({
        ...form,
        adults: parseInt(form.adults),
        children: parseInt(form.children),
        totalAmount: parseFloat(form.totalAmount),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#D2C4B4] rounded-3xl max-w-lg w-full p-7 shadow-2xl space-y-5 text-[#0F172A]">
        <div className="flex items-center justify-between border-b border-[#D2C4B4] pb-4">
          <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#81A6C6]" /> Create New Reservation
          </h3>
          <button onClick={onClose} className="rounded-xl p-1 text-slate-400 hover:bg-[#AACDDC]/30 hover:text-[#0F172A] transition">
            ✕
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); setError(''); mutation.mutate(); }} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Select Guest *</label>
            <select
              required
              value={form.guestId}
              onChange={(e) => setForm({ ...form, guestId: e.target.value })}
              className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
            >
              <option value="">Choose guest profile...</option>
              {guestsList.map((g: any) => (
                <option key={g.id || g.guestId} value={g.id || g.guestId}>
                  {g.firstName} {g.lastName} ({g.email || 'No email'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Select Room *</label>
            <select
              required
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
            >
              <option value="">Choose available room...</option>
              {roomsList.map((r: any) => (
                <option key={r.id || r.roomId} value={r.id || r.roomId}>
                  Room {r.number || r.roomNumber} ({r.roomType?.name || 'Standard'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Check-in *</label>
              <input
                type="date"
                required
                value={form.checkIn}
                onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Check-out *</label>
              <input
                type="date"
                required
                value={form.checkOut}
                onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Adults</label>
              <input
                type="number"
                min="1"
                value={form.adults}
                onChange={(e) => setForm({ ...form, adults: e.target.value })}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Children</label>
              <input
                type="number"
                min="0"
                value={form.children}
                onChange={(e) => setForm({ ...form, children: e.target.value })}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Total Amount (PKR) *</label>
              <input
                type="number"
                required
                placeholder="14000"
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Special Requests</label>
            <Textarea
              value={form.specialRequests}
              onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
              placeholder="e.g. Late check-in, extra towels..."
            />
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-[#FAF5EF] text-[#0F172A] border border-[#D2C4B4] font-semibold text-sm hover:bg-[#AACDDC]/30 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 h-11 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
            >
              {mutation.isPending ? 'Creating...' : 'Create Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
