import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  BedDouble,
  Grid,
  List,
  Filter,
  Tag,
} from 'lucide-react';
import { roomsService } from '@/services/rooms.service';
import { Textarea } from '@/components/ui/Form';
import { formatCurrency, cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { RoomStatus } from '@/types';

export const Route = createFileRoute('/_authenticated/rooms')({
  component: RoomsPage,
});

function RoomsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [statusFilter, setStatusFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [cleaningFilter, setCleaningFilter] = useState('');
  const [roomModal, setRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);

  const { data: roomsData, isLoading: roomsLoading, isError: roomsError, refetch } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsService.getAll(),
  });

  const { data: typesData } = useQuery({
    queryKey: ['room-types'],
    queryFn: roomsService.getTypes,
  });

  const deleteRoom = useMutation({
    mutationFn: roomsService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });

  const canManage = user?.role !== 'STAFF';

  const roomsList: any[] = Array.isArray(roomsData) ? roomsData : Array.isArray((roomsData as any)?.items) ? (roomsData as any).items : [];
  const typesList: any[] = Array.isArray(typesData) ? typesData : Array.isArray((typesData as any)?.items) ? (typesData as any).items : [];

  // Filter rooms list
  const filteredRooms = roomsList.filter((r) => {
    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesFloor = !floorFilter || String(r.floor || 1) === floorFilter;
    const matchesCleaning = !cleaningFilter || (r.cleaningStatus || 'CLEAN') === cleaningFilter;
    return matchesStatus && matchesFloor && matchesCleaning;
  });

  return (
    <div className="space-y-8 text-[#1E293B]">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-[#D2C4B4] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1E293B] flex items-center gap-3">
            <BedDouble className="w-8 h-8 text-[#81A6C6]" /> Room Inventory & Status
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Real-time physical room inventory, floor allocations, housekeeping readiness, and rate tiers.
          </p>
        </div>

        <div className="flex items-center gap-3.5">
          <Link
            to="/room-types"
            className="flex items-center gap-2 h-11 px-4 rounded-xl bg-white hover:bg-[#FAF5EF] text-[#81A6C6] border border-[#D2C4B4] text-sm font-semibold transition shadow-sm"
          >
            <Tag className="w-4 h-4 text-[#81A6C6]" /> Room Types & Rates
          </Link>

          {canManage && (
            <button
              onClick={() => {
                setEditingRoom(null);
                setRoomModal(true);
              }}
              className="flex items-center gap-2 h-11 px-5 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white text-sm font-bold shadow-sm transition active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> Add New Room
            </button>
          )}
        </div>
      </div>

      {/* Control Bar: Filters & View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Dropdowns with h-11 height & generous padding */}
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex items-center gap-2 h-11 px-4 rounded-xl bg-white border border-[#D2C4B4] text-sm font-medium shadow-sm hover:border-[#81A6C6] transition">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm text-[#1E293B] focus:outline-none font-semibold cursor-pointer"
            >
              <option value="">All Room Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="RESERVED">Reserved</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          <div className="flex items-center gap-2 h-11 px-4 rounded-xl bg-white border border-[#D2C4B4] text-sm font-medium shadow-sm hover:border-[#81A6C6] transition">
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="bg-transparent text-sm text-[#1E293B] focus:outline-none font-semibold cursor-pointer"
            >
              <option value="">All Floors</option>
              <option value="1">Floor 1</option>
              <option value="2">Floor 2</option>
              <option value="3">Floor 3</option>
            </select>
          </div>

          <div className="flex items-center gap-2 h-11 px-4 rounded-xl bg-white border border-[#D2C4B4] text-sm font-medium shadow-sm hover:border-[#81A6C6] transition">
            <select
              value={cleaningFilter}
              onChange={(e) => setCleaningFilter(e.target.value)}
              className="bg-transparent text-sm text-[#1E293B] focus:outline-none font-semibold cursor-pointer"
            >
              <option value="">All Housekeeping Statuses</option>
              <option value="CLEAN">Clean & Ready</option>
              <option value="DIRTY">Dirty / Cleaning Needed</option>
              <option value="INSPECTION">Inspection Pending</option>
            </select>
          </div>
        </div>

        {/* Grid vs Table View Toggle Buttons */}
        <div className="flex items-center gap-1.5 h-11 bg-white border border-[#D2C4B4] p-1.5 rounded-xl shrink-0 self-end sm:self-auto shadow-sm">
          <button
            onClick={() => setViewMode('GRID')}
            className={cn(
              'flex items-center gap-2 h-8 px-4 rounded-lg text-xs font-bold transition duration-150',
              viewMode === 'GRID' ? 'bg-[#81A6C6] text-white shadow-sm' : 'text-slate-600 hover:text-[#1E293B] hover:bg-[#FAF5EF]'
            )}
          >
            <Grid className="w-3.5 h-3.5" /> Card Grid
          </button>
          <button
            onClick={() => setViewMode('TABLE')}
            className={cn(
              'flex items-center gap-2 h-8 px-4 rounded-lg text-xs font-bold transition duration-150',
              viewMode === 'TABLE' ? 'bg-[#81A6C6] text-white shadow-sm' : 'text-slate-600 hover:text-[#1E293B] hover:bg-[#FAF5EF]'
            )}
          >
            <List className="w-3.5 h-3.5" /> High-Density Table
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {roomsLoading ? (
        <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-[#FAF5EF] border border-[#D2C4B4] animate-pulse" />
          ))}
        </div>
      ) : roomsError ? (
        <div className="p-10 text-center space-y-4 rounded-3xl bg-white border border-[#D2C4B4] shadow-sm">
          <p className="text-base font-bold text-rose-600">Failed to load room inventory.</p>
          <button onClick={() => refetch()} className="px-5 py-2.5 rounded-xl bg-[#81A6C6] text-sm font-bold text-white shadow-sm">Retry Load</button>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-16 text-center space-y-4 rounded-3xl bg-white border border-[#D2C4B4] shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF5EF] text-slate-500 flex items-center justify-center mx-auto border border-[#D2C4B4]">
            <BedDouble className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">No Rooms Found</h3>
          <p className="text-sm text-slate-600 max-w-sm mx-auto font-medium">
            No rooms match the selected floor or housekeeping filter settings.
          </p>
        </div>
      ) : viewMode === 'GRID' ? (
        /* Grid Card View with Generous Gap & Breathing Room */
        <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filteredRooms.map((room) => {
            const roomTypeName = room.roomTypeName || room.roomType?.name || 'Standard Room';
            const price = room.basePrice || room.roomType?.basePrice || 12000;
            const isAvailable = room.status === 'AVAILABLE';
            const isOccupied = room.status === 'OCCUPIED';
            const isMaintenance = room.status === 'MAINTENANCE';

            return (
              <div
                key={room.id || room.roomId}
                className="rounded-3xl border border-[#D2C4B4] bg-white p-7 hover:border-[#81A6C6] hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[270px] shadow-sm"
              >
                <div className="space-y-4">
                  {/* Top Row: Large Room Number Title & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-[#1E293B]">
                        Room {room.number || room.roomNumber}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-sm font-medium text-slate-600">
                        <span>{roomTypeName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-mono font-bold text-[#81A6C6] bg-[#FAF5EF] px-2 py-0.5 rounded-md border border-[#D2C4B4]">
                          Floor {room.floor || 1}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge with Dot Indicator */}
                    <span
                      className={cn(
                        'inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full border shadow-xs shrink-0',
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isOccupied
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          : isMaintenance
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      )}
                    >
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          isAvailable ? 'bg-emerald-600' : isOccupied ? 'bg-indigo-600' : isMaintenance ? 'bg-rose-600' : 'bg-amber-600'
                        )}
                      />
                      {room.status}
                    </span>
                  </div>

                  {/* Pricing & Housekeeping Readiness Section */}
                  <div className="mt-5 pt-4 border-t border-[#D2C4B4]/60 flex items-center justify-between">
                    <div>
                      <span className="block text-xs uppercase tracking-wider font-bold text-slate-500">
                        Nightly Rate
                      </span>
                      <div className="text-xl font-bold text-[#1E293B] mt-0.5">
                        {formatCurrency(price, user?.hotel?.currency ?? 'PKR')}
                      </div>
                    </div>

                    <span
                      className={cn(
                        'text-xs font-bold px-3 py-1 rounded-xl border uppercase tracking-wider shadow-xs',
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
                </div>

                {/* Bottom Action Strip with Proper Separation */}
                {canManage && (
                  <div className="flex items-center gap-3 mt-6 pt-5 border-t border-[#D2C4B4]/60">
                    <button
                      onClick={() => {
                        setEditingRoom(room);
                        setRoomModal(true);
                      }}
                      className="flex-1 h-11 py-2.5 px-4 text-sm font-semibold rounded-xl bg-[#FAF5EF] hover:bg-[#AACDDC]/30 text-[#1E293B] border border-[#D2C4B4] transition flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                    >
                      <Pencil className="w-4 h-4 text-[#81A6C6]" /> Edit Room
                    </button>
                    <button
                      onClick={() => deleteRoom.mutate(room.id || room.roomId)}
                      className="h-11 w-11 flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition shadow-xs shrink-0"
                      title="Delete Room"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* High-Density Table View */
        <div className="rounded-3xl border border-[#D2C4B4] bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#FAF5EF] border-b border-[#D2C4B4] text-slate-600 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-4">Room Number</th>
                  <th className="p-4">Tier & Type</th>
                  <th className="p-4">Floor</th>
                  <th className="p-4">Nightly Rate</th>
                  <th className="p-4">Housekeeping</th>
                  <th className="p-4">Occupancy Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D2C4B4]/60">
                {filteredRooms.map((room) => {
                  const roomTypeName = room.roomTypeName || room.roomType?.name || 'Standard Room';
                  const price = room.basePrice || room.roomType?.basePrice || 12000;

                  return (
                    <tr key={room.id || room.roomId} className="hover:bg-[#FAF5EF]/60 transition duration-150">
                      <td className="p-4 font-bold text-[#1E293B] text-base flex items-center gap-2">
                        <BedDouble className="w-5 h-5 text-[#81A6C6]" /> Room {room.number || room.roomNumber}
                      </td>
                      <td className="p-4 text-slate-700 font-medium">{roomTypeName}</td>
                      <td className="p-4 font-mono text-slate-600">Floor {room.floor || 1}</td>
                      <td className="p-4 font-bold text-[#1E293B] text-base">{formatCurrency(price, user?.hotel?.currency ?? 'PKR')}</td>
                      <td className="p-4">
                        <span
                          className={cn(
                            'text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider',
                            room.cleaningStatus === 'DIRTY'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : room.cleaningStatus === 'INSPECTION'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          )}
                        >
                          {room.cleaningStatus || 'CLEAN'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border',
                            room.status === 'AVAILABLE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : room.status === 'OCCUPIED'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          )}
                        >
                          {room.status}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        {canManage && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingRoom(room);
                                setRoomModal(true);
                              }}
                              className="p-2 rounded-xl bg-[#FAF5EF] hover:bg-[#AACDDC]/30 text-slate-700 border border-[#D2C4B4] transition"
                            >
                              <Pencil className="w-4 h-4 text-[#81A6C6]" />
                            </button>
                            <button
                              onClick={() => deleteRoom.mutate(room.id || room.roomId)}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {roomModal && (
        <RoomFormModal open={roomModal} onClose={() => setRoomModal(false)} room={editingRoom} types={typesList} />
      )}
    </div>
  );
}

// ─── Room Modal Component ─────────────────────────────────────────────────────
function RoomFormModal({
  open,
  onClose,
  room,
  types,
}: {
  open: boolean;
  onClose: () => void;
  room: any | null;
  types: any[];
}) {
  const queryClient = useQueryClient();
  const [number, setNumber] = useState(room?.number || room?.roomNumber || '');
  const [roomTypeId, setRoomTypeId] = useState(room?.roomTypeId || types?.[0]?.typeId || types?.[0]?.id || '');
  const [floor, setFloor] = useState(String(room?.floor || '1'));
  const [status, setStatus] = useState<RoomStatus>(room?.status || 'AVAILABLE');
  const [notes, setNotes] = useState(room?.notes || '');

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        number,
        roomTypeId,
        floor: parseInt(floor),
        status,
        notes: notes || undefined,
      };
      if (room) {
        return roomsService.update(room.id || room.roomId, data);
      }
      return roomsService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#D2C4B4] rounded-3xl max-w-md w-full p-7 shadow-2xl space-y-5 text-[#0F172A]">
        <div className="flex items-center justify-between border-b border-[#D2C4B4] pb-4">
          <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-[#81A6C6]" /> {room ? 'Edit Room' : 'Add New Room'}
          </h3>
          <button onClick={onClose} className="rounded-xl p-1 text-slate-400 hover:bg-[#AACDDC]/30 hover:text-[#0F172A] transition">
            ✕
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Room Number *</label>
            <input
              type="text"
              required
              placeholder="e.g. 101"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Room Type Tier *</label>
            <select
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
            >
              {types.map((t) => (
                <option key={t.typeId || t.id} value={t.typeId || t.id}>
                  {t.name} ({t.basePrice ? formatCurrency(t.basePrice, 'PKR') : 'Standard'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Floor Level</label>
              <input
                type="number"
                min={1}
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RoomStatus)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              >
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="RESERVED">Reserved</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special features or view info..." />
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
              {mutation.isPending ? 'Saving...' : room ? 'Update Room' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
