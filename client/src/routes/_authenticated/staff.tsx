import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, RefreshCw, UserCheck } from 'lucide-react';
import { staffService, StaffUser } from '@/services/staff.service';
import { Modal } from '@/components/ui/Form';

export const Route = createFileRoute('/_authenticated/staff')({
  component: StaffManagementPage,
});

function StaffManagementPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'OWNER' | 'MANAGER' | 'STAFF'>('STAFF');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: staff, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['staff'],
    queryFn: staffService.getStaff,
    refetchInterval: 20000,
  });

  const createMutation = useMutation({
    mutationFn: staffService.createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setModalOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to add staff user.');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName) {
      setErrorMsg('All fields are required.');
      return;
    }
    createMutation.mutate({ firstName, lastName, email, password, role });
  };

  const staffList: StaffUser[] = Array.isArray(staff)
    ? staff
    : Array.isArray((staff as any)?.items)
    ? (staff as any).items
    : [];

  return (
    <div className="space-y-8 text-[var(--text-primary)]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <Users className="w-8 h-8 text-[#81A6C6]" /> Staff & RBAC Permissions
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
            Manage hotel team accounts and assign role-based access permissions (Owner, Manager, Staff).
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 h-11 px-5 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white text-sm font-bold shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add Team Member
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-[var(--text-muted)] text-sm font-medium">Loading staff members...</div>
      ) : isError ? (
        <div className="p-10 text-center space-y-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm">
          <p className="text-base font-bold text-rose-600">Failed to load staff accounts.</p>
          <p className="text-xs text-[var(--text-muted)]">{(error as Error)?.message || 'Check server connection.'}</p>
          <button onClick={() => refetch()} className="px-5 py-2.5 rounded-xl bg-[#81A6C6] text-sm font-bold text-white shadow-sm">
            Retry Load
          </button>
        </div>
      ) : (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 shadow-sm overflow-hidden space-y-4 text-[var(--text-primary)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#81A6C6]" /> Registered Staff Roster ({staffList.length})
            </h2>
            <button onClick={() => refetch()} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-bold flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Sync
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-medium text-[var(--text-primary)]">
                {staffList.map((member: any) => (
                  <tr key={member.userId || member.id} className="hover:bg-[var(--bg-surface)] transition">
                    <td className="p-4 font-bold text-[var(--text-primary)]">
                      {member.firstName} {member.lastName}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] font-mono">{member.email}</td>
                    <td className="p-4">
                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                          member.role === 'OWNER'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                            : member.role === 'MANAGER'
                            ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30'
                            : 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    </td>
                    <td className="p-4 text-[var(--text-muted)] font-mono">
                      {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {modalOpen && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Staff Member" size="md">
          <form onSubmit={handleCreate} className="space-y-4 text-sm">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Password *</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Assigned Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              >
                <option value="STAFF">STAFF (Check-in, Check-out, View Bookings)</option>
                <option value="MANAGER">MANAGER (Manage Rooms, Rates, Guests, OTA)</option>
                <option value="OWNER">OWNER (Full Hotel & Financial Control)</option>
              </select>
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 h-11 rounded-xl bg-[#FAF5EF] text-[#0F172A] border border-[#D2C4B4] font-semibold text-sm hover:bg-[#AACDDC]/30 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
              >
                {createMutation.isPending ? 'Adding Member...' : 'Add Staff Member'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
