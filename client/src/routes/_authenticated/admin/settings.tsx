import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Palette, Clock, CheckCircle2, Sun, Moon, Monitor } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/admin/settings')({
  component: HotelSettingsPage,
});

function HotelSettingsPage() {
  const queryClient = useQueryClient();
  const { theme, setTheme, activeTheme } = useTheme();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: adminService.getSettings,
  });

  const [form, setForm] = useState({
    name: 'Orillusive Grand Hotel & Suites',
    phone: '+92 51 111 222 333',
    city: 'Islamabad',
    country: 'Pakistan',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    defaultTaxRate: 16,
    cancellationPolicy: 'Free cancellation up to 24 hours prior to check-in date. Late cancellations or no-shows incur 1 night room rate charge.',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name || 'Orillusive Grand Hotel & Suites',
        phone: settings.phone || '+92 51 111 222 333',
        city: settings.city || 'Islamabad',
        country: settings.country || 'Pakistan',
        currency: settings.currency || 'PKR',
        timezone: settings.timezone || 'Asia/Karachi',
        checkInTime: settings.checkInTime || '14:00',
        checkOutTime: settings.checkOutTime || '12:00',
        defaultTaxRate: Number(settings.defaultTaxRate ?? 16),
        cancellationPolicy: settings.cancellationPolicy || 'Free cancellation up to 24 hours prior to check-in date.',
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => adminService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Hotel Profile & System Settings</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
            Manage property profile details, check-in/out policies, tax configuration, and platform theme preferences.
          </p>
        </div>

        {saveSuccess && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Settings Saved!
          </span>
        )}
      </div>

      {/* Theme Preference Selector */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 space-y-5 shadow-sm text-[var(--text-primary)]">
        <div>
          <h2 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-[#81A6C6]" /> Platform Theme & Visual Palette
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
            Choose your preferred interface theme. Selected theme is instantly applied across all hotel management modules and saved to your device.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Light Luxury Option */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={cn(
              'p-5 rounded-2xl border text-left transition-all duration-200 space-y-3 flex flex-col justify-between cursor-pointer',
              theme === 'light'
                ? 'border-[#81A6C6] bg-[var(--bg-surface)] ring-2 ring-[#81A6C6] shadow-sm'
                : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[#81A6C6]'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#FAF5EF] border border-[#D2C4B4] flex items-center justify-center text-[#81A6C6]">
                <Sun className="w-5 h-5" />
              </div>
              {theme === 'light' && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#81A6C6] text-white">
                  Active ({activeTheme})
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-[var(--text-primary)] text-sm">Light Luxury</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Warm Cream & Slate Blue</p>
            </div>
          </button>

          {/* Modern Dark Option */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={cn(
              'p-5 rounded-2xl border text-left transition-all duration-200 space-y-3 flex flex-col justify-between cursor-pointer',
              theme === 'dark'
                ? 'border-[#81A6C6] bg-[var(--bg-surface)] ring-2 ring-[#81A6C6] shadow-sm'
                : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[#81A6C6]'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
                <Moon className="w-5 h-5" />
              </div>
              {theme === 'dark' && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#81A6C6] text-white">
                  Active ({activeTheme})
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-[var(--text-primary)] text-sm">Modern Dark</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Deep Slate & Sapphire</p>
            </div>
          </button>

          {/* System Default Option */}
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={cn(
              'p-5 rounded-2xl border text-left transition-all duration-200 space-y-3 flex flex-col justify-between cursor-pointer',
              theme === 'system'
                ? 'border-[#81A6C6] bg-[var(--bg-surface)] ring-2 ring-[#81A6C6] shadow-sm'
                : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[#81A6C6]'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[#81A6C6]">
                <Monitor className="w-5 h-5" />
              </div>
              {theme === 'system' && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#81A6C6] text-white">
                  System ({activeTheme})
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-[var(--text-primary)] text-sm">System Default</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Sync with OS Preference</p>
            </div>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-sm">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 space-y-5 shadow-sm text-[var(--text-primary)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#81A6C6]" /> Property Profile
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Hotel / Resort Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-11 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 text-sm text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[#81A6C6] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Phone Contact</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-11 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 text-sm text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[#81A6C6] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full h-11 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 text-sm text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[#81A6C6] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Country</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full h-11 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 text-sm text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[#81A6C6] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Operating Currency</label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full h-11 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 text-sm text-[#81A6C6] font-extrabold focus:ring-2 focus:ring-[#81A6C6] outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Timezone</label>
              <input
                type="text"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full h-11 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 text-sm text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[#81A6C6] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 space-y-5 shadow-sm text-[var(--text-primary)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-[#81A6C6]" /> Timings & Tax Policies
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Check-in Time</label>
              <input
                type="text"
                value={form.checkInTime}
                onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
                className="w-full h-11 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 text-sm text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[#81A6C6] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Check-out Time</label>
              <input
                type="text"
                value={form.checkOutTime}
                onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
                className="w-full h-11 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 text-sm text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[#81A6C6] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Default Tax Rate (%)</label>
              <input
                type="number"
                value={form.defaultTaxRate}
                onChange={(e) => setForm({ ...form, defaultTaxRate: Number(e.target.value) })}
                className="w-full h-11 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 text-sm text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[#81A6C6] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Cancellation Policy Notice</label>
            <textarea
              rows={3}
              value={form.cancellationPolicy}
              onChange={(e) => setForm({ ...form, cancellationPolicy: e.target.value })}
              className="w-full min-h-[90px] bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-4 text-sm text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-[#81A6C6] outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="w-full h-12 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm transition shadow-sm disabled:opacity-50 active:scale-[0.98]"
        >
          {updateMutation.isPending ? 'Saving Settings...' : 'Save Hotel Settings'}
        </button>
      </form>
    </div>
  );
}
