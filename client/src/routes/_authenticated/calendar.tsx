import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  ShieldAlert,
  User,
  BedDouble,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { calendarService } from '@/services/calendar.service';
import { roomsService } from '@/services/rooms.service';
import { bookingsService } from '@/services/bookings.service';
import { PageLoader } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export const Route = createFileRoute('/_authenticated/calendar')({
  component: CalendarPage,
});

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CalendarBooking {
  bookingId: string;
  bookingNumber: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  source: string;
  totalAmount: number;
  paidAmount?: number;
  paymentStatus?: string;
}

interface CalendarRoom {
  roomId: string;
  roomNumber: string;
  floor?: number;
  status: string;
  cleaningStatus?: string;
  roomTypeId: string;
  roomTypeName: string;
  basePrice: number;
  bookings: CalendarBooking[];
}

interface DayInfo {
  dateStr: string;
  dayNum: number;
  dayName: string;
  isToday: boolean;
  isWeekend: boolean;
}

function getDaysInMonth(year: number, month: number): DayInfo[] {
  const days: DayInfo[] = [];
  const date = new Date(year, month - 1, 1);
  const todayStr = new Date().toISOString().split('T')[0];

  while (date.getMonth() === month - 1) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayOfWeek = date.getDay();

    days.push({
      dateStr,
      dayNum: date.getDate(),
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });

    date.setDate(date.getDate() + 1);
  }
  return days;
}

interface CellRender {
  type: 'EMPTY' | 'BOOKING';
  colSpan: number;
  dateStr: string;
  booking?: CalendarBooking;
}

function getRowCells(room: CalendarRoom, days: DayInfo[]): CellRender[] {
  const cells: CellRender[] = [];
  let dayIdx = 0;
  const numDays = days.length;

  while (dayIdx < numDays) {
    const currentDateStr = days[dayIdx].dateStr;

    const booking = (room.bookings || []).find((b) => {
      const bStart = b.checkIn.split('T')[0];
      const bEnd = b.checkOut.split('T')[0];

      if (bStart === currentDateStr) return true;
      if (dayIdx === 0 && bStart < currentDateStr && bEnd > currentDateStr) return true;
      return false;
    });

    if (booking) {
      const bStart = booking.checkIn.split('T')[0];
      const bEnd = booking.checkOut.split('T')[0];

      let span = 0;
      for (let k = dayIdx; k < numDays; k++) {
        const dStr = days[k].dateStr;
        if (dStr >= bStart && dStr < bEnd) {
          span++;
        } else {
          break;
        }
      }

      const finalSpan = Math.max(1, span);
      cells.push({
        type: 'BOOKING',
        colSpan: finalSpan,
        dateStr: currentDateStr,
        booking,
      });
      dayIdx += finalSpan;
    } else {
      cells.push({
        type: 'EMPTY',
        colSpan: 1,
        dateStr: currentDateStr,
      });
      dayIdx += 1;
    }
  }

  return cells;
}

function CalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // Modal States
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ roomId: string; roomNumber: string; dateStr: string; basePrice: number } | null>(null);

  const daysList = getDaysInMonth(year, month);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => calendarService.getGrid(year, month),
    refetchInterval: 30000,
  });

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const jumpToToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  const canManage = user?.role !== 'STAFF';
  const rawRooms = Array.isArray(data?.rooms) ? data.rooms : [];
  const roomsList: CalendarRoom[] = rawRooms.map((r: any) => ({
    roomId: r.roomId || r.id,
    roomNumber: String(r.roomNumber || r.number || 'N/A'),
    floor: r.floor || 1,
    status: r.status || 'AVAILABLE',
    cleaningStatus: r.cleaningStatus || 'CLEAN',
    roomTypeId: r.roomTypeId || '',
    roomTypeName: r.roomTypeName || r.roomType?.name || 'Standard Room',
    basePrice: Number(r.basePrice || r.roomType?.basePrice || 12000),
    bookings: Array.isArray(r.bookings) ? r.bookings : [],
  }));

  // Group rooms by category/type
  const roomsGroupedByType = roomsList.reduce((acc, room) => {
    const typeName = room.roomTypeName || 'Standard Rooms';
    if (!acc[typeName]) acc[typeName] = [];
    acc[typeName].push(room);
    return acc;
  }, {} as Record<string, CalendarRoom[]>);

  const handleEmptySlotClick = (room: CalendarRoom, dateStr: string) => {
    setSelectedSlot({
      roomId: room.roomId,
      roomNumber: room.roomNumber,
      dateStr,
      basePrice: room.basePrice || 12000,
    });
    setNewBookingModalOpen(true);
  };

  if (isLoading) return <PageLoader />;

  if (isError || !data) {
    return (
      <div className="p-8 text-center space-y-4 rounded-2xl bg-white border border-[#D2C4B4] shadow-sm">
        <h2 className="text-lg font-bold text-rose-600 flex items-center justify-center gap-2">
          <ShieldAlert className="w-5 h-5" /> Unable to Load Availability Calendar
        </h2>
        <p className="text-xs text-slate-500">
          {(error as Error)?.message || 'Communication error with SaaS server.'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-[#81A6C6] text-white hover:bg-[#6C93B5] transition"
        >
          Retry Load
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#1E293B]">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#D2C4B4] pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1E293B] flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-[#81A6C6]" /> Interactive Availability Matrix
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Real-time room allocation grid, multi-day booking spans, cleaning readiness badges & instant slot reservations.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-xl bg-white border border-[#D2C4B4] p-1 text-xs font-bold shadow-sm">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-[#FAF5EF] text-slate-600 hover:text-[#1E293B] transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 min-w-[130px] text-center font-extrabold text-[#1E293B]">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-[#FAF5EF] text-slate-600 hover:text-[#1E293B] transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={jumpToToday}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF5EF] text-[#81A6C6] border border-[#D2C4B4] text-xs font-bold transition shadow-sm"
          >
            Today
          </button>

          {canManage && (
            <button
              onClick={() => setBlockModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Block Room
            </button>
          )}
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl bg-white border border-[#D2C4B4] text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">Status Legend:</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-600 shadow-sm" />
            <span className="text-[#1E293B] font-medium">Checked In</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 shadow-sm" />
            <span className="text-[#1E293B] font-medium">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#81A6C6] shadow-sm" />
            <span className="text-[#1E293B] font-medium">Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-600 shadow-sm" />
            <span className="text-[#1E293B] font-medium">Maintenance / Blocked</span>
          </div>
        </div>

        <div className="text-[11px] text-[#81A6C6] font-bold flex items-center gap-1">
          <Info className="w-3.5 h-3.5" /> Click any empty slot to create a instant booking.
        </div>
      </div>

      {/* Matrix Grid Container */}
      <div className="rounded-2xl border border-[#D2C4B4] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            {/* Table Header: Date Row */}
            <thead>
              <tr className="bg-[#FAF5EF] border-b border-[#D2C4B4] text-xs select-none">
                <th className="sticky left-0 z-20 bg-[#FAF5EF] p-3.5 w-64 min-w-[240px] font-extrabold text-[#1E293B] border-r border-[#D2C4B4] shadow-sm">
                  Room Category / Number
                </th>
                {daysList.map((day) => (
                  <th
                    key={day.dateStr}
                    className={cn(
                      'p-2 text-center border-r border-[#D2C4B4]/60 min-w-[42px] transition-colors',
                      day.isToday ? 'bg-[#AACDDC]/40 text-[#1E293B] font-extrabold' : day.isWeekend ? 'bg-[#F3E3D0]/40 text-slate-600' : 'text-slate-600'
                    )}
                  >
                    <div className="text-[10px] uppercase font-bold text-slate-500">{day.dayName}</div>
                    <div className={cn('text-sm font-extrabold mt-0.5', day.isToday ? 'text-[#81A6C6]' : 'text-[#1E293B]')}>
                      {day.dayNum}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: Grouped by Room Category */}
            <tbody className="divide-y divide-[#D2C4B4]/60 text-xs">
              {Object.entries(roomsGroupedByType).map(([typeName, rooms]) => (
                <tbody key={typeName} className="divide-y divide-[#D2C4B4]/60">
                  {/* Category Header Row */}
                  <tr className="bg-[#FAF5EF] border-y border-[#D2C4B4]">
                    <td
                      colSpan={daysList.length + 1}
                      className="px-4 py-2 text-xs font-extrabold text-[#81A6C6] uppercase tracking-wider bg-[#FAF5EF]"
                    >
                      {typeName} ({rooms.length} {rooms.length === 1 ? 'Room' : 'Rooms'})
                    </td>
                  </tr>

                  {/* Room Rows */}
                  {rooms.map((room) => {
                    const rowCells = getRowCells(room, daysList);

                    return (
                      <tr key={room.roomId} className="hover:bg-[#FAF5EF]/60 transition">
                        {/* Left Y-Axis Sticky Room Column */}
                        <td className="sticky left-0 z-10 bg-white p-3 border-r border-[#D2C4B4] shadow-sm whitespace-nowrap">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-extrabold text-[#1E293B] text-sm flex items-center gap-1.5">
                                <BedDouble className="w-4 h-4 text-[#81A6C6] shrink-0" />
                                <span>Room {room.roomNumber}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                Floor {room.floor || 1} • {room.basePrice.toLocaleString()} PKR/night
                              </div>
                            </div>

                            {/* Cleaning Readiness Badge */}
                            <span
                              className={cn(
                                'text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0',
                                room.cleaningStatus === 'DIRTY'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : room.cleaningStatus === 'INSPECTION'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              )}
                            >
                              {room.cleaningStatus || 'CLEAN'}
                            </span>
                          </div>
                        </td>

                        {/* X-Axis Date Slots & Booking Colspans */}
                        {rowCells.map((cell, idx) => {
                          if (cell.type === 'BOOKING' && cell.booking) {
                            const b = cell.booking;
                            const isCheckedIn = b.status === 'CHECKED_IN';
                            const isConfirmed = b.status === 'CONFIRMED';
                            const isBlocked = b.status === 'BLOCKED' || b.status === 'MAINTENANCE';

                            return (
                              <td
                                key={idx}
                                colSpan={cell.colSpan}
                                className="p-1 border-r border-[#D2C4B4]/60 align-middle"
                              >
                                <div className="group relative">
                                  {/* Color-Coded Reservation Bar */}
                                  <div
                                    className={cn(
                                      'px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-150 cursor-pointer flex items-center justify-between gap-2 shadow-sm',
                                      isCheckedIn
                                        ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                        : isConfirmed
                                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                        : isBlocked
                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                        : 'bg-[#AACDDC]/40 text-[#1E293B] border-[#81A6C6]/40'
                                    )}
                                  >
                                    <div className="truncate flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                      <span className="truncate">{b.guestName}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/70 font-bold border border-slate-200">
                                        {b.source || 'DIRECT'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Detailed Hover Tooltip Summary */}
                                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 w-72 p-4 rounded-2xl bg-white border border-[#D2C4B4] shadow-2xl text-xs space-y-2 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between border-b border-[#D2C4B4] pb-2">
                                      <span className="font-extrabold text-[#1E293B] text-sm">{b.guestName}</span>
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#AACDDC]/30 text-[#81A6C6] font-bold border border-[#81A6C6]/30">
                                        {b.bookingNumber}
                                      </span>
                                    </div>

                                    <div className="space-y-1 text-slate-600 text-[11px]">
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Dates:</span>
                                        <span className="font-semibold text-[#1E293B]">
                                          {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Reservation Status:</span>
                                        <span className="font-bold text-emerald-700">{b.status}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Booking Source:</span>
                                        <span className="font-semibold text-[#81A6C6]">{b.source}</span>
                                      </div>
                                      <div className="flex justify-between border-t border-[#D2C4B4] pt-1">
                                        <span className="text-slate-400">Total Amount:</span>
                                        <span className="font-extrabold text-[#1E293B]">{b.totalAmount.toLocaleString()} PKR</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          // Empty Date Slot
                          return (
                            <td
                              key={idx}
                              onClick={() => handleEmptySlotClick(room, cell.dateStr)}
                              className="p-1 border-r border-[#D2C4B4]/60 transition-colors hover:bg-[#81A6C6]/15 cursor-pointer group"
                              title={`Click to book Room ${room.roomNumber} for ${cell.dateStr}`}
                            >
                              <div className="h-9 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="w-3.5 h-3.5 text-[#81A6C6]" />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block Room Modal */}
      {blockModalOpen && (
        <BlockRoomModal open={blockModalOpen} onClose={() => setBlockModalOpen(false)} onSuccess={() => refetch()} />
      )}

      {/* Instant New Booking Modal */}
      {newBookingModalOpen && selectedSlot && (
        <InstantNewBookingModal
          open={newBookingModalOpen}
          slot={selectedSlot}
          onClose={() => setNewBookingModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}

// ─── Instant New Booking Modal Component ──────────────────────────────────────
function InstantNewBookingModal({
  open,
  slot,
  onClose,
  onSuccess,
}: {
  open: boolean;
  slot: { roomId: string; roomNumber: string; dateStr: string; basePrice: number };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();

  const nextDay = new Date(slot.dateStr);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [checkIn, setCheckIn] = useState(slot.dateStr);
  const [checkOut, setCheckOut] = useState(nextDayStr);
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [totalAmount, setTotalAmount] = useState(String(slot.basePrice));
  const [paidAmount, setPaidAmount] = useState('0');
  const [source, setSource] = useState('DIRECT');
  const [errorMsg, setErrorMsg] = useState('');

  const mutation = useMutation({
    mutationFn: bookingsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create booking.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !checkIn || !checkOut) {
      setErrorMsg('Guest name, check-in, and check-out dates are required.');
      return;
    }

    mutation.mutate({
      roomId: slot.roomId,
      firstName,
      lastName,
      email,
      phone,
      checkIn,
      checkOut,
      adults: Number(adults),
      children: Number(children),
      totalAmount: Number(totalAmount),
      paidAmount: Number(paidAmount),
      source,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#D2C4B4] rounded-3xl max-w-lg w-full p-7 shadow-2xl space-y-5 text-[#0F172A]">
        <div className="flex items-center justify-between border-b border-[#D2C4B4] pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#81A6C6]" /> New Booking for Room {slot.roomNumber}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Pre-filled slot date: <span className="font-mono text-[#81A6C6] font-extrabold">{slot.dateStr}</span></p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1 text-slate-400 hover:bg-[#AACDDC]/30 hover:text-[#0F172A] transition">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">First Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tariq"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Last Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mahmood"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="guest@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Phone Number</label>
              <input
                type="text"
                placeholder="+92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Adult Guests</label>
              <input
                type="number"
                min={1}
                max={10}
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Children</label>
              <input
                type="number"
                min={0}
                max={10}
                value={children}
                onChange={(e) => setChildren(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Check-in Date *</label>
              <input
                type="date"
                required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Check-out Date *</label>
              <input
                type="date"
                required
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Total Amount (PKR) *</label>
              <input
                type="number"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Paid Amount (PKR)</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              >
                <option value="DIRECT">Direct</option>
                <option value="PHONE">Phone</option>
                <option value="WALK_IN">Walk-In</option>
                <option value="WEBSITE">Website</option>
                <option value="OTA">OTA Channel</option>
              </select>
            </div>
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
              {mutation.isPending ? 'Creating Booking...' : 'Confirm & Reserve Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Block Room Modal Component ───────────────────────────────────────────────
function BlockRoomModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    roomId: '',
    startDate: '',
    endDate: '',
    reason: 'MAINTENANCE',
    notes: '',
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsService.getAll({ limit: '100' }),
    enabled: open,
  });

  const modalRoomsList = Array.isArray(rooms) ? rooms : Array.isArray((rooms as any)?.items) ? (rooms as any).items : [];

  const mutation = useMutation({
    mutationFn: () => calendarService.createBlock(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      onSuccess();
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#D2C4B4] rounded-3xl max-w-md w-full p-7 shadow-2xl space-y-5 text-[#0F172A]">
        <div className="flex items-center justify-between border-b border-[#D2C4B4] pb-4">
          <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" /> Block Room / Maintenance
          </h3>
          <button onClick={onClose} className="rounded-xl p-1 text-slate-400 hover:bg-[#AACDDC]/30 hover:text-[#0F172A] transition">
            ✕
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Select Room *</label>
            <select
              required
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
            >
              <option value="">Choose a room...</option>
              {modalRoomsList.map((r: any) => (
                <option key={r.id || r.roomId} value={r.id || r.roomId}>
                  Room {r.number || r.roomNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Start Date *</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">End Date *</label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Block Reason</label>
            <select
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
            >
              <option value="MAINTENANCE">Maintenance & Repairs</option>
              <option value="RENOVATION">Renovation</option>
              <option value="OWNER_USE">Owner Use</option>
              <option value="OTHER">Other</option>
            </select>
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
              className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
            >
              {mutation.isPending ? 'Blocking...' : 'Confirm Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
