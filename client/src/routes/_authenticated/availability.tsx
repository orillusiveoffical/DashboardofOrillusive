import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Lock, Unlock, RefreshCw, AlertTriangle } from 'lucide-react';
import { availabilityService } from '@/services/availability.service';
import { Modal } from '@/components/ui/Form';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/availability')({
  component: AvailabilityManagementPage,
});

const MAINTENANCE_REASONS = [
  'Deep Cleaning & Sanitization',
  'AC Maintenance & HVAC Repair',
  'Plumbing & Bathroom Overhaul',
  'Interior Painting & Renovation',
  'Electrical & Cable Wiring Check',
  'Routine Manager Hold',
];

function AvailabilityManagementPage() {
  const queryClient = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [blockReason, setBlockReason] = useState('Deep Cleaning & Sanitization');
  const [customNotes, setCustomNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );

  const { data: availability, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['availability'],
    queryFn: availabilityService.getOverview,
    refetchInterval: 20000,
  });

  const blockMutation = useMutation({
    mutationFn: ({ roomId, notes, status }: { roomId: string; notes?: string; status?: string }) =>
      availabilityService.blockRoom(roomId, notes, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setSelectedRoomId(null);
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (roomId: string) => availabilityService.unblockRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  const availList: any[] = Array.isArray(availability)
    ? availability
    : Array.isArray((availability as any)?.items)
    ? (availability as any).items
    : [];

  const handleOpenBlockModal = (room: any) => {
    setSelectedRoomId(room.roomId || room.id);
    setSelectedRoomNumber(room.roomNumber || room.number || '');
  };

  return (
    <div className="space-y-8 text-[#0F172A]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-[#D2C4B4] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A] flex items-center gap-3">
            <Calendar className="w-8 h-8 text-[#81A6C6]" /> Room Availability & Maintenance Locks
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Open, close, or block rooms for maintenance. Changes update central HMS inventory and push to connected OTAs instantly.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 h-11 px-5 rounded-xl bg-white hover:bg-[#FAF5EF] text-[#0F172A] border border-[#D2C4B4] text-sm font-semibold shadow-sm transition active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4 text-[#81A6C6]" /> Refresh Grid
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 rounded-3xl bg-[#FAF5EF] border border-[#D2C4B4] animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-10 text-center space-y-4 rounded-3xl bg-white border border-[#D2C4B4] shadow-sm">
          <p className="text-base font-bold text-rose-600">Failed to load room availability grid.</p>
          <p className="text-xs text-slate-500">{(error as Error)?.message || 'Check server connection.'}</p>
          <button onClick={() => refetch()} className="px-5 py-2.5 rounded-xl bg-[#81A6C6] text-sm font-bold text-white shadow-sm">
            Retry Load
          </button>
        </div>
      ) : availList.length === 0 ? (
        <div className="p-16 text-center space-y-3 rounded-3xl bg-white border border-[#D2C4B4] shadow-sm text-slate-600">
          <AlertTriangle className="w-10 h-10 text-[#81A6C6] mx-auto" />
          <h3 className="text-lg font-bold text-[#0F172A]">No Room Inventory Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium">
            Please add rooms in the Room Inventory section before managing maintenance holds.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {availList.map((room) => {
            const isBlocked = room.status === 'BLOCKED' || room.status === 'MAINTENANCE';
            const isOccupied = room.status === 'OCCUPIED';

            return (
              <div
                key={room.roomId || room.id}
                className={cn(
                  'rounded-3xl border p-7 transition-all duration-200 flex flex-col justify-between min-h-[260px] shadow-sm',
                  isBlocked
                    ? 'border-amber-300 bg-amber-50/60 shadow-amber-100'
                    : isOccupied
                    ? 'border-indigo-200 bg-indigo-50/60 shadow-indigo-100'
                    : 'border-[#D2C4B4] bg-white hover:border-[#81A6C6] hover:shadow-md'
                )}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-[#0F172A] text-2xl tracking-tight">
                        Room {room.roomNumber || room.number}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-1">
                        Floor {room.floor || 1} • {room.roomTypeName || 'Standard Room'}
                      </p>
                    </div>

                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs',
                        isBlocked
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : isOccupied
                          ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      )}
                    >
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          isBlocked ? 'bg-amber-600' : isOccupied ? 'bg-indigo-600' : 'bg-emerald-600'
                        )}
                      />
                      {room.status}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-[#D2C4B4]/60 text-xs text-slate-600 space-y-1 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Bookings:</span>
                      <span className="font-bold text-[#0F172A]">{(room.bookings ?? []).length}</span>
                    </div>
                    {isBlocked && room.notes && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-semibold">
                        Log: {room.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-[#D2C4B4]/60 flex gap-3">
                  {isBlocked ? (
                    <button
                      onClick={() => unblockMutation.mutate(room.roomId || room.id)}
                      disabled={unblockMutation.isPending}
                      className="w-full h-11 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                    >
                      <Unlock className="w-4 h-4" /> Re-open Room Inventory
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenBlockModal(room)}
                      className="w-full h-11 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-sm font-bold transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <Lock className="w-4 h-4 text-amber-700" /> Maintenance Block Hold
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Maintenance Block Modal */}
      {selectedRoomId && (
        <Modal
          open={!!selectedRoomId}
          onClose={() => setSelectedRoomId(null)}
          title={`Set Maintenance Lock — Room ${selectedRoomNumber}`}
          size="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fullNotes = `${blockReason}${customNotes ? ` — ${customNotes}` : ''} (${startDate} to ${endDate})`;
              blockMutation.mutate({ roomId: selectedRoomId, notes: fullNotes, status: 'BLOCKED' });
            }}
            className="space-y-4 text-sm"
          >
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                Maintenance Category / Reason *
              </label>
              <select
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full h-11 rounded-xl border border-[#D2C4B4] bg-white px-4 py-2.5 text-sm text-[#0F172A] outline-none font-medium focus:ring-2 focus:ring-[#81A6C6]"
              >
                {MAINTENANCE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Start Date *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[#D2C4B4] bg-white px-4 py-2.5 text-sm text-[#0F172A] outline-none font-mono focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">End Date *</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[#D2C4B4] bg-white px-4 py-2.5 text-sm text-[#0F172A] outline-none font-mono focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Work Description / Log Notes</label>
              <textarea
                rows={3}
                placeholder="Details for housekeeping or engineering staff..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full rounded-xl border border-[#D2C4B4] bg-white p-4 text-sm text-[#0F172A] placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedRoomId(null)}
                className="flex-1 h-11 rounded-xl bg-[#FAF5EF] text-[#0F172A] border border-[#D2C4B4] font-semibold text-sm hover:bg-[#AACDDC]/30 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={blockMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
              >
                {blockMutation.isPending ? 'Locking Inventory...' : 'Lock Room Inventory'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
