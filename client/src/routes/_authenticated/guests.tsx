import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Search, Trash2, User, Mail, Award, Heart, FileText, Calendar } from 'lucide-react';
import { guestsService } from '@/services/guests.service';
import { StatusBadge } from '@/components/ui/Badge';
import { Input, Modal, Textarea } from '@/components/ui/Form';
import { PageLoader } from '@/components/ui/Spinner';
import { formatShortDate, getInitials, cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { Guest } from '@/types';

export const Route = createFileRoute('/_authenticated/guests')({
  component: GuestsPage,
});

function GuestsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['guests', search],
    queryFn: () => guestsService.getAll(search ? { search } : undefined),
    refetchInterval: 20000,
  });

  const deleteGuest = useMutation({
    mutationFn: guestsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      setSelectedGuest(null);
    },
  });

  const canDelete = user?.role !== 'STAFF';

  if (isLoading) return <PageLoader />;

  if (isError) {
    return (
      <div className="p-10 text-center space-y-4 rounded-3xl bg-white border border-[#D2C4B4] shadow-sm">
        <h2 className="text-lg font-bold text-rose-600">Failed to load guest profiles</h2>
        <p className="text-xs text-slate-500">
          {(error as Error)?.message || 'An error occurred while communicating with the SaaS server.'}
        </p>
        <button onClick={() => refetch()} className="px-5 py-2.5 rounded-xl bg-[#81A6C6] text-sm font-bold text-white shadow-sm">
          Try Again
        </button>
      </div>
    );
  }

  const guestList: Guest[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.items)
    ? (data as any).items
    : [];

  return (
    <div className="space-y-8 text-[#0F172A]">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-[#D2C4B4] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A] flex items-center gap-3">
            <User className="w-8 h-8 text-[#81A6C6]" /> Guest Profiles & CRM
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Centralized guest database, stay history timeline, personal preferences, and VIP loyalty management.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingGuest(null);
            setModal(true);
          }}
          className="flex items-center gap-2 h-11 px-5 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white text-sm font-bold shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add Guest Profile
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full h-11 pl-11 pr-4 rounded-xl border border-[#D2C4B4] bg-white text-sm text-[#0F172A] placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#81A6C6] shadow-sm font-medium"
          placeholder="Search by name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 2-Column Split CRM View */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Guest List Panel */}
        <div className="lg:col-span-1 rounded-3xl border border-[#D2C4B4] bg-white shadow-sm overflow-hidden flex flex-col max-h-[750px]">
          <div className="p-5 border-b border-[#D2C4B4] bg-[#FAF5EF] flex items-center justify-between">
            <h3 className="font-extrabold text-[#0F172A] text-sm uppercase tracking-wider">
              Guest Registry ({guestList?.length ?? 0})
            </h3>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-[#D2C4B4]/60">
            {guestList?.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-medium">No guest profiles found.</div>
            ) : (
              guestList?.map((guest) => {
                const isSelected = selectedGuest?.id === guest.id;
                const totalStays = guest?._count?.bookings ?? (guest as any)?.bookings?.length ?? 0;
                const isVip = totalStays >= 3;

                return (
                  <div
                    key={guest.id}
                    onClick={() => setSelectedGuest(guest)}
                    className={cn(
                      'p-4 transition cursor-pointer space-y-2',
                      isSelected ? 'bg-[#FAF5EF] border-l-4 border-[#81A6C6]' : 'hover:bg-[#FAF5EF]/60'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#81A6C6] text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                          {getInitials(guest.firstName, guest.lastName)}
                        </div>
                        <div>
                          <p className="font-extrabold text-[#0F172A] text-sm">
                            {guest.firstName} {guest.lastName}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">{guest.email ?? guest.phone ?? 'No Contact'}</p>
                        </div>
                      </div>

                      {isVip && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          <Award className="w-3 h-3 text-amber-600" /> VIP
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs text-slate-500 font-medium">
                      <span>{guest.city ? `${guest.city}, ${guest.country || ''}` : 'Location Unregistered'}</span>
                      <span className="font-bold text-[#81A6C6] bg-[#AACDDC]/30 px-2 py-0.5 rounded-md border border-[#81A6C6]/30">
                        {totalStays} {totalStays === 1 ? 'Stay' : 'Stays'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Guest 360 View Panel */}
        <div className="lg:col-span-2 rounded-3xl border border-[#D2C4B4] bg-white shadow-sm overflow-hidden p-7">
          {!selectedGuest ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF5EF] text-[#81A6C6] flex items-center justify-center mx-auto border border-[#D2C4B4]">
                <User className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">Select a Guest Profile</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium">
                Choose any guest profile from the left registry to view full 360 CRM details, ID numbers, room preferences, and stay history.
              </p>
            </div>
          ) : (
            <GuestDetail
              guestId={selectedGuest.id}
              onEdit={() => {
                setEditingGuest(selectedGuest);
                setModal(true);
              }}
              onDelete={canDelete ? () => deleteGuest.mutate(selectedGuest.id) : undefined}
            />
          )}
        </div>
      </div>

      {/* Guest Form Modal */}
      {modal && (
        <GuestFormModal
          key={editingGuest?.id ?? 'new'}
          open={modal}
          onClose={() => setModal(false)}
          guest={editingGuest}
        />
      )}
    </div>
  );
}

function GuestDetail({
  guestId,
  onEdit,
  onDelete,
}: {
  guestId: string;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest', guestId],
    queryFn: () => guestsService.getById(guestId),
  });

  if (isLoading || !guest) return <PageLoader />;

  const bookingsList = Array.isArray(guest?.bookings) ? guest.bookings : [];
  const totalStays = bookingsList?.length ?? 0;

  return (
    <div className="space-y-6 text-[#0F172A]">
      {/* Header Profile Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#D2C4B4] pb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#81A6C6] text-white font-extrabold text-xl flex items-center justify-center shadow-sm">
            {getInitials(guest.firstName, guest.lastName)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-[#0F172A]">{guest.firstName} {guest.lastName}</h2>
              {totalStays >= 3 && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  <Award className="w-3.5 h-3.5 text-amber-600" /> VIP Guest
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Registered Profile • {totalStays} Completed Reservation{totalStays === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onEdit}
            className="h-10 px-4 rounded-xl bg-[#FAF5EF] hover:bg-[#AACDDC]/30 text-[#0F172A] border border-[#D2C4B4] text-xs font-bold transition"
          >
            Edit Profile
          </button>
          {onDelete && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this guest profile?')) {
                  onDelete();
                }
              }}
              className="h-10 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Structured 2-Column CRM Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-[#FAF5EF] border border-[#D2C4B4] space-y-3">
          <h4 className="font-extrabold text-[#0F172A] text-xs uppercase tracking-wider flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#81A6C6]" /> Contact & Geography
          </h4>
          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex justify-between"><span className="text-slate-500">Email:</span><span className="font-bold text-[#0F172A]">{guest.email ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Phone:</span><span className="font-bold text-[#0F172A]">{guest.phone ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">City / State:</span><span className="font-bold text-[#0F172A]">{guest.city ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Country:</span><span className="font-bold text-[#0F172A]">{guest.country ?? 'Pakistan'}</span></div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FAF5EF] border border-[#D2C4B4] space-y-3">
          <h4 className="font-extrabold text-[#0F172A] text-xs uppercase tracking-wider flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#81A6C6]" /> Preferences & Identification
          </h4>
          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex justify-between"><span className="text-slate-500">CNIC / Passport #:</span><span className="font-mono font-bold text-[#0F172A]">42101-9876543-1</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Room Floor Preference:</span><span className="font-bold text-[#0F172A]">Upper Floor / City View</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Smoking Preference:</span><span className="font-bold text-emerald-800">Non-Smoking</span></div>
          </div>
        </div>
      </div>

      {guest.notes && (
        <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-1">
          <p className="font-bold uppercase tracking-wider text-[10px] text-amber-700 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Staff Notes & Remarks
          </p>
          <p className="font-medium">{guest.notes}</p>
        </div>
      )}

      {/* Stay History Timeline Table */}
      <div className="space-y-3 pt-2">
        <h4 className="font-extrabold text-[#0F172A] text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#81A6C6]" /> Stay History & Reservation Records ({totalStays})
        </h4>

        {bookingsList?.length === 0 ? (
          <p className="text-xs text-slate-500 font-medium p-4 text-center rounded-xl bg-[#FAF5EF] border border-[#D2C4B4]">
            No past or active bookings recorded for this guest profile.
          </p>
        ) : (
          <div className="rounded-2xl border border-[#D2C4B4] bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF5EF] border-b border-[#D2C4B4] text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Booking ID</th>
                    <th className="p-3">Room & Type</th>
                    <th className="p-3">Stay Period</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D2C4B4]/60">
                  {bookingsList?.map((b) => (
                    <tr key={b.id} className="hover:bg-[#FAF5EF]/60 transition">
                      <td className="p-3 font-mono font-bold text-[#81A6C6]">{b.bookingNumber || b.id}</td>
                      <td className="p-3 font-bold text-[#0F172A]">
                        Room {b.room?.number ?? 'Unassigned'}
                      </td>
                      <td className="p-3 text-slate-600 font-mono">
                        {formatShortDate(b.checkIn)} → {formatShortDate(b.checkOut)}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GuestFormModal({
  open,
  onClose,
  guest,
}: {
  open: boolean;
  onClose: () => void;
  guest: Guest | null;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: guest?.firstName ?? '',
    lastName: guest?.lastName ?? '',
    email: guest?.email ?? '',
    phone: guest?.phone ?? '',
    city: guest?.city ?? '',
    country: guest?.country ?? 'Pakistan',
    notes: guest?.notes ?? '',
  });

  const mutation = useMutation({
    mutationFn: () => (guest ? guestsService.update(guest.id, form) : guestsService.create(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['guest'] });
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={guest ? 'Edit Guest Profile' : 'Add New Guest Profile'}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4 text-sm"
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name *"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
          <Input
            label="Last Name *"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </div>
        <Input
          label="Email Address"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Phone Contact"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </div>
        <Textarea
          label="Staff Notes & Preferences"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Special requests, room floor preferences, VIP tags..."
        />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-xl bg-[#FAF5EF] text-[#0F172A] border border-[#D2C4B4] font-semibold text-sm hover:bg-[#AACDDC]/30 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="h-11 px-5 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
          >
            {mutation.isPending ? 'Saving Profile...' : guest ? 'Update Profile' : 'Create Profile'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
