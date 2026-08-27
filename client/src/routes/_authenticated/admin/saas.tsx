import { useState } from 'react';
import { createFileRoute, redirect, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Building2, CreditCard, Ban, CheckCircle, Database, Layers, ShieldAlert, ArrowLeft } from 'lucide-react';
import { adminService, TenantRecord } from '@/services/admin.service';
import { useAuth } from '@/hooks/useAuth';

export const Route = createFileRoute('/_authenticated/admin/saas')({
  beforeLoad: () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw redirect({ to: '/login', search: { expired: undefined } });
    }
  },
  component: SaasSuperAdminPortal,
});

function SaasSuperAdminPortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<TenantRecord | null>(null);

  // Authorization Check: Reject Non-Super Admins immediately with HTTP 403 Forbidden UI
  if (user && (user.role as any) !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full rounded-3xl border border-rose-500/30 bg-slate-900/90 p-8 shadow-2xl space-y-6 text-center backdrop-blur-xl">
          <div className="inline-flex p-4 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-lg shadow-rose-500/10">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">403 Access Forbidden</h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Your account role <span className="font-bold text-rose-400">({user.role})</span> is not authorized to access platform tenant administration or multi-tenant database infrastructure.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Hotel Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { data: stats } = useQuery({
    queryKey: ['saas-stats'],
    queryFn: adminService.getStats,
    enabled: !!user && (user.role as any) === 'SUPER_ADMIN',
  });

  const { data: tenants } = useQuery({
    queryKey: ['saas-tenants'],
    queryFn: adminService.getTenants,
    enabled: !!user && (user.role as any) === 'SUPER_ADMIN',
  });

  const { data: plans } = useQuery({
    queryKey: ['saas-plans'],
    queryFn: adminService.getPlans,
    enabled: !!user && (user.role as any) === 'SUPER_ADMIN',
  });

  const { data: logs } = useQuery({
    queryKey: ['saas-logs'],
    queryFn: adminService.getLogs,
    enabled: !!user && (user.role as any) === 'SUPER_ADMIN',
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ tenantId, planId }: { tenantId: string; planId: string }) =>
      adminService.updateTenantPlan(tenantId, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['saas-stats'] });
      setSelectedTenant(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ tenantId, status }: { tenantId: string; status: string }) =>
      adminService.updateTenantStatus(tenantId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['saas-stats'] });
    },
  });

  const tenantsList: TenantRecord[] = Array.isArray(tenants) ? tenants : Array.isArray((tenants as any)?.items) ? (tenants as any).items : [];
  const plansBreakdown = Array.isArray(stats?.planBreakdown) ? stats.planBreakdown : [];
  const logsList: any[] = Array.isArray(logs) ? logs : Array.isArray((logs as any)?.items) ? (logs as any).items : [];

  return (
    <div className="space-y-8 p-6 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-indigo-400" /> SaaS Super Admin Portal
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Platform-wide SaaS analytics, multi-tenant database monitoring, and subscription management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> Central SaaS DB Active
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Tenants Registered</span>
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">{stats.totalTenants ?? 0}</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1">{stats.activeTenants ?? 0} Active Hotels</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Monthly Recurring Revenue</span>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-emerald-400">
              {(stats.totalRevenuePkr ?? 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">PKR</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Across all active plans</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Active Subscriptions</span>
              <CheckCircle className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">{stats.activeTenants ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">Paying Subscribers</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Suspended Hotels</span>
              <Ban className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-rose-400">{stats.suspendedTenants ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">Access Suspended</div>
          </div>
        </div>
      )}

      {/* Plan Breakdown */}
      {plansBreakdown.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" /> Subscription Plan Breakdown
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plansBreakdown.map((pb) => (
              <div key={pb.planId} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{pb.name}</span>
                  <span className="text-xs text-indigo-400 font-semibold">{pb.pricePkr.toLocaleString()} PKR/mo</span>
                </div>
                <div className="text-2xl font-extrabold text-white mt-1">{pb.tenantCount} <span className="text-xs text-slate-400 font-normal">Hotels</span></div>
                <div className="text-[11px] text-slate-500">Revenue: {pb.monthlyRevenuePkr.toLocaleString()} PKR</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tenants Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-400" /> Tenant Registry & Database Manager
        </h2>

        <div className="overflow-x-auto">
          {tenantsList.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No registered tenants found.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Hotel / Property</th>
                  <th className="p-3">Owner Email</th>
                  <th className="p-3">Database</th>
                  <th className="p-3">Subscription Plan</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tenantsList.map((t) => (
                  <tr key={t.tenantId} className="hover:bg-slate-800/30">
                    <td className="p-3 font-semibold text-white">
                      <div>{t.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{t.tenantId}</div>
                    </td>
                    <td className="p-3 text-xs text-slate-300">{t.ownerEmail}</td>
                    <td className="p-3 font-mono text-xs text-indigo-300">{t.dbName}</td>
                    <td className="p-3">
                      <span className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
                        {t.planName}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded font-bold border ${
                          t.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedTenant(t)}
                        className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                      >
                        Change Plan
                      </button>

                      {t.status === 'ACTIVE' ? (
                        <button
                          onClick={() => updateStatusMutation.mutate({ tenantId: t.tenantId, status: 'SUSPENDED' })}
                          className="text-xs px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-medium"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatusMutation.mutate({ tenantId: t.tenantId, status: 'ACTIVE' })}
                          className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Platform Audit Logs */}
      {logsList.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" /> Platform Security & Audit Logs
          </h2>

          <div className="space-y-2">
            {logsList.map((log: any) => (
              <div key={log.logId || log.id} className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">{log.action}</span>
                  <span className="text-slate-400 ml-2">by {log.userEmail} ({log.role})</span>
                </div>
                <span className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D2C4B4] rounded-3xl max-w-md w-full p-7 shadow-2xl space-y-5 text-[#0F172A]">
            <h3 className="text-lg font-extrabold text-[#0F172A]">Change Plan: {selectedTenant.name}</h3>

            <div className="space-y-2.5 text-xs">
              {plans && plans.map((p) => (
                <button
                  key={p.planId}
                  onClick={() => updatePlanMutation.mutate({ tenantId: selectedTenant.tenantId, planId: p.planId })}
                  disabled={updatePlanMutation.isPending}
                  className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#AACDDC]/30 border border-[#D2C4B4] text-left flex items-center justify-between text-[#0F172A] transition"
                >
                  <div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">{p.pricePkr.toLocaleString()} PKR/mo</div>
                  </div>
                  {p.planId === selectedTenant.planId && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold">
                      Current
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelectedTenant(null)}
              className="w-full h-11 rounded-xl bg-[#FAF5EF] border border-[#D2C4B4] text-[#0F172A] text-xs font-bold hover:bg-[#AACDDC]/30 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
