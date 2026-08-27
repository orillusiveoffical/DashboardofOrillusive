import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Tag, SlidersHorizontal, DollarSign } from 'lucide-react';
import { roomsService } from '@/services/rooms.service';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui/Form';

export const Route = createFileRoute('/_authenticated/room-types')({
  component: RoomTypesManagementPage,
});

function RoomTypesManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [ratePlanModalOpen, setRatePlanModalOpen] = useState(false);
  const [selectedRateType, setSelectedRateType] = useState<any | null>(null);

  // Form state for creation
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState(14000);
  const [maxOccupancy, setMaxOccupancy] = useState(2);
  const [maxChildren, setMaxChildren] = useState(1);
  const [extraBedFee, setExtraBedFee] = useState(3500);
  const [amenityInput, setAmenityInput] = useState('Free Wi-Fi, AC, Mini Bar, City View');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: roomTypes, isLoading, isError, refetch } = useQuery({
    queryKey: ['room-types'],
    queryFn: roomsService.getRoomTypes,
  });

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsService.getAll(),
  });

  const rawRooms: any[] = Array.isArray(roomsData)
    ? roomsData
    : Array.isArray((roomsData as any)?.items)
    ? (roomsData as any).items
    : [];

  const createMutation = useMutation({
    mutationFn: roomsService.createType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-types'] });
      setCreateModalOpen(false);
      setName('');
      setDescription('');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create room type.');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || basePrice <= 0) {
      setErrorMsg('Name and valid base price are required.');
      return;
    }

    const amenities = amenityInput.split(',').map((s) => s.trim()).filter(Boolean);

    createMutation.mutate({
      name,
      description,
      basePrice,
      maxOccupancy,
      amenities,
    } as any);
  };

  const typesList: any[] = Array.isArray(roomTypes)
    ? roomTypes
    : Array.isArray((roomTypes as any)?.items)
    ? (roomTypes as any).items
    : [];

  return (
    <div className="space-y-8 text-[var(--text-primary)]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <Tag className="w-8 h-8 text-[#81A6C6]" /> Room Types & Rate Plans
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
            Configure room category tiers, base pricing per night, extra bed charges & seasonal rate rules.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 h-11 px-5 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white text-sm font-bold shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add Room Category
        </button>
      </div>

      {/* Grid of Room Type Cards */}
      {isLoading ? (
        <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-10 text-center space-y-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm">
          <p className="text-base font-bold text-rose-600">Failed to load room type categories.</p>
          <button onClick={() => refetch()} className="px-5 py-2.5 rounded-xl bg-[#81A6C6] text-sm font-bold text-white">
            Retry Load
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {typesList.map((rt: any) => {
            const activeRoomsCount = rawRooms.filter((r) => r.roomTypeId === (rt.id || rt.typeId)).length;
            const extraBed = rt.extraBedFee || 3500;
            const adults = rt.maxOccupancy || 2;
            const kids = rt.maxChildren || 1;

            return (
              <div
                key={rt.id || rt.typeId}
                className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 hover:border-[#81A6C6] hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-5 shadow-sm min-h-[320px] text-[var(--text-primary)]"
              >
                <div className="space-y-4">
                  {/* Single Line Title and Right-Aligned Rate */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-[var(--text-primary)] text-xl truncate whitespace-nowrap">{rt.name}</h3>
                      <span className="inline-block mt-1 text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-[#81A6C6]/20 text-[var(--text-primary)] font-bold border border-[#81A6C6]/30 whitespace-nowrap">
                        {activeRoomsCount} {activeRoomsCount === 1 ? 'Active Room' : 'Active Rooms'}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(rt.basePrice, user?.hotel?.currency ?? 'PKR')}
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] font-medium whitespace-nowrap">/ night</span>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                    {rt.description || 'Standard luxury room category tier.'}
                  </p>

                  <div className="pt-3 border-t border-[var(--border)] space-y-2 text-xs text-[var(--text-secondary)] font-medium">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#81A6C6]" /> Max Occupancy:
                      </span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {adults} Adults, {kids} Child
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-amber-600" /> Extra Bed Charge:
                      </span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        +{formatCurrency(extraBed, user?.hotel?.currency ?? 'PKR')}/night
                      </span>
                    </div>
                  </div>

                  {rt.amenities && rt.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rt.amenities.map((am: string, i: number) => (
                        <span
                          key={i}
                          className="text-[11px] px-2.5 py-0.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] font-semibold"
                        >
                          {am}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <button
                    onClick={() => {
                      setSelectedRateType(rt);
                      setRatePlanModalOpen(true);
                    }}
                    className="w-full h-11 rounded-xl bg-[var(--bg-surface)] hover:bg-[#81A6C6]/20 text-[var(--text-primary)] font-bold text-xs transition flex items-center justify-center gap-2 border border-[var(--border)] shadow-xs active:scale-[0.98]"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-[#81A6C6]" /> Edit Rate Plan & Rules
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Rate Plan Modal */}
      {ratePlanModalOpen && selectedRateType && (
        <EditRatePlanModal
          open={ratePlanModalOpen}
          roomType={selectedRateType}
          onClose={() => setRatePlanModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Create Room Type Modal */}
      {createModalOpen && (
        <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Room Category" size="md">
          <form onSubmit={handleCreate} className="space-y-4 text-sm">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Executive Suite"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Description</label>
              <textarea
                rows={2}
                placeholder="Panoramic view, king bed, jacuzzi bath..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-[#D2C4B4] bg-white p-4 text-sm text-[#0F172A] outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Base Rate (PKR) *</label>
                <input
                  type="number"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Extra Bed Charge</label>
                <input
                  type="number"
                  value={extraBedFee}
                  onChange={(e) => setExtraBedFee(Number(e.target.value))}
                  className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Max Adults</label>
                <input
                  type="number"
                  required
                  value={maxOccupancy}
                  onChange={(e) => setMaxOccupancy(Number(e.target.value))}
                  className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Max Children</label>
                <input
                  type="number"
                  value={maxChildren}
                  onChange={(e) => setMaxChildren(Number(e.target.value))}
                  className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Amenities (Comma separated)</label>
              <input
                type="text"
                placeholder="Free Wi-Fi, AC, Jacuzzi, Breakfast"
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="flex-1 h-11 rounded-xl bg-[#FAF5EF] text-[#0F172A] border border-[#D2C4B4] font-semibold text-sm hover:bg-[#AACDDC]/30 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
              >
                {createMutation.isPending ? 'Saving Category...' : 'Save Room Type'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Edit Rate Plan Modal Component ───────────────────────────────────────────
function EditRatePlanModal({
  open,
  roomType,
  onClose,
  onSuccess,
}: {
  open: boolean;
  roomType: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();

  const [basePrice, setBasePrice] = useState(roomType.basePrice || 14000);
  const [extraBedFee, setExtraBedFee] = useState(roomType.extraBedFee || 3500);
  const [seasonalMarkup, setSeasonalMarkup] = useState('15');
  const [cancellationPolicy, setCancellationPolicy] = useState('MODERATE');
  const [saving, setSaving] = useState(false);

  const handleSaveRatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await roomsService.updateType(roomType.id || roomType.typeId, {
        basePrice: Number(basePrice),
        extraBedFee: Number(extraBedFee),
        seasonalMarkup: Number(seasonalMarkup),
        cancellationPolicy,
      } as any);

      queryClient.invalidateQueries({ queryKey: ['room-types'] });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Rate Plan Rules — ${roomType.name}`} size="md">
      <form onSubmit={handleSaveRatePlan} className="space-y-4 text-sm text-[#0F172A]">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Standard Rate / Night *</label>
            <input
              type="number"
              required
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
              className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Extra Bed Charge</label>
            <input
              type="number"
              value={extraBedFee}
              onChange={(e) => setExtraBedFee(Number(e.target.value))}
              className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Peak Season Markup (%)</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              max="100"
              value={seasonalMarkup}
              onChange={(e) => setSeasonalMarkup(e.target.value)}
              className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
            />
            <span className="text-xs font-bold text-[#81A6C6] shrink-0">+ {seasonalMarkup}%</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Cancellation Policy</label>
          <select
            value={cancellationPolicy}
            onChange={(e) => setCancellationPolicy(e.target.value)}
            className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
          >
            <option value="FLEXIBLE">Flexible (Free cancellation up to 24 hours before check-in)</option>
            <option value="MODERATE">Moderate (Free cancellation up to 48 hours before check-in)</option>
            <option value="STRICT">Strict (50% refund up to 7 days before check-in)</option>
            <option value="NON_REFUNDABLE">Non-Refundable (100% charge upon booking)</option>
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
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
          >
            {saving ? 'Updating Plan...' : 'Save Rate Rules'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
