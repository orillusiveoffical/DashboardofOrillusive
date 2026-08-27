import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import { Button, Input, Select, Modal } from '@/components/ui/Form';
import { PageLoader } from '@/components/ui/Spinner';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

export const Route = createFileRoute('/_authenticated/admin/users')({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data: users, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminService.getUsers,
  });

  const deleteUser = useMutation({
    mutationFn: adminService.deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const isOwner = user?.role === 'OWNER';

  if (isLoading) return <PageLoader />;

  if (isError) {
    return (
      <Card className="p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold text-red-600">Failed to load users</h2>
        <p className="text-sm text-slate-500">
          {(error as Error)?.message || 'An error occurred while communicating with the server.'}
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </Card>
    );
  }

  const usersList: any[] = Array.isArray(users) ? users : Array.isArray((users as any)?.items) ? (users as any).items : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Users</h1>
          <p className="text-sm text-slate-500">Add and manage staff accounts</p>
        </div>
        {isOwner && (
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          {usersList.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No users found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Status</th>
                  {isOwner && <th className="pb-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id || u.userId} className="border-b border-slate-50">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                          {getInitials(u.firstName, u.lastName)}
                        </div>
                        <span className="font-medium">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">{u.email}</td>
                    <td className="py-3"><span className="badge bg-slate-100 text-slate-700">{u.role}</span></td>
                    <td className="py-3">
                      <span className={`badge ${u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isOwner && (
                      <td className="py-3">
                        {u.id !== user?.id && (
                          <Button variant="danger" className="px-2 py-1" onClick={() => deleteUser.mutate(u.id || u.userId)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <CreateUserModal open={modal} onClose={() => setModal(false)} />
    </div>
  );
}

function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'STAFF' as UserRole,
    phone: '',
  });

  const mutation = useMutation({
    mutationFn: () => adminService.createUser(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Add User">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          options={[
            { value: 'STAFF', label: 'Staff' },
            { value: 'MANAGER', label: 'Manager' },
            { value: 'OWNER', label: 'Owner' },
          ]} />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Create User</Button>
        </div>
      </form>
    </Modal>
  );
}
