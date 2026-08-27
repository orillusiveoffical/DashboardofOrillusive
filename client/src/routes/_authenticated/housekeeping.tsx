import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, UserCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import { housekeepingService, HousekeepingTask } from '@/services/housekeeping.service';
import { Modal } from '@/components/ui/Form';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/housekeeping')({
  component: HousekeepingManagementPage,
});

const HOUSEKEEPERS = [
  'Ayesha Khan',
  'Tariq Mahmood',
  'Fatima Bibi',
  'Bilal Ahmed',
  'Unassigned Staff',
];

const FILTER_TABS = [
  { id: '', label: 'All Rooms' },
  { id: 'CLEAN', label: 'Clean' },
  { id: 'DIRTY', label: 'Dirty' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'INSPECTION', label: 'Inspection Required' },
];

function HousekeepingManagementPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(null);
  const [status, setStatus] = useState<string>('CLEAN');
  const [assignedTo, setAssignedTo] = useState('Unassigned Staff');

  const { data: tasks, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['housekeeping'],
    queryFn: housekeepingService.getAll,
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ roomId, data }: { roomId: string; data: any }) =>
      housekeepingService.updateStatus(roomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setSelectedTask(null);
    },
  });

  const tasksList: HousekeepingTask[] = Array.isArray(tasks)
    ? tasks
    : Array.isArray((tasks as any)?.items)
    ? (tasks as any).items
    : [];

  const filteredTasks = tasksList.filter((t) => {
    if (!statusFilter) return true;
    return t.cleaningStatus === statusFilter;
  });

  return (
    <div className="space-y-8 text-[#0F172A]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-[#D2C4B4] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A] flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-[#81A6C6]" /> Housekeeping & Room Readiness
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Track room cleaning statuses (Clean, Dirty, In Progress, Inspection) and assign housekeeper staff.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 h-11 px-5 rounded-xl bg-white hover:bg-[#FAF5EF] text-[#0F172A] border border-[#D2C4B4] text-sm font-semibold shadow-sm transition active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4 text-[#81A6C6]" /> Refresh Tasks
        </button>
      </div>

      {/* Top Filter Tabs Bar */}
      <div className="flex items-center gap-1.5 bg-white border border-[#D2C4B4] p-1.5 rounded-xl overflow-x-auto shadow-sm">
        {FILTER_TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition duration-150',
                isActive
                  ? 'bg-[#81A6C6] text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-[#0F172A] hover:bg-[#FAF5EF]'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 rounded-3xl bg-[#FAF5EF] border border-[#D2C4B4] animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-10 text-center space-y-4 rounded-3xl bg-white border border-[#D2C4B4] shadow-sm">
          <p className="text-base font-bold text-rose-600">Failed to load housekeeping tasks.</p>
          <p className="text-xs text-slate-500">{(error as Error)?.message || 'Check server connection.'}</p>
          <button onClick={() => refetch()} className="px-5 py-2.5 rounded-xl bg-[#81A6C6] text-sm font-bold text-white shadow-sm">
            Retry Load
          </button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-16 text-center space-y-3 rounded-3xl bg-white border border-[#D2C4B4] shadow-sm text-slate-600">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-lg font-bold text-[#0F172A]">All Rooms Clear</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium">
            No housekeeping tasks match the selected cleaning status tab.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filteredTasks.map((task) => {
            const isClean = task.cleaningStatus === 'CLEAN';
            const isDirty = task.cleaningStatus === 'DIRTY';
            const isInProgress = task.cleaningStatus === 'IN_PROGRESS';

            return (
              <div
                key={task.roomId}
                className="rounded-3xl border border-[#D2C4B4] bg-white p-7 hover:border-[#81A6C6] hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[260px] shadow-sm"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-[#0F172A] text-2xl tracking-tight">
                        Room {task.roomNumber}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-1">
                        Occupancy Status: <span className="font-bold text-[#0F172A]">{task.roomStatus || 'AVAILABLE'}</span>
                      </p>
                    </div>

                    {/* Color-Coded Housekeeping Badges */}
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs',
                        isClean
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isDirty
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : isInProgress
                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                          : 'bg-purple-50 text-purple-800 border-purple-200'
                      )}
                    >
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          isClean ? 'bg-emerald-600' : isDirty ? 'bg-amber-600' : isInProgress ? 'bg-sky-600' : 'bg-purple-600'
                        )}
                      />
                      {task.cleaningStatus}
                    </span>
                  </div>

                  {/* Inline Housekeeper Assignment Dropdown */}
                  <div className="pt-4 border-t border-[#D2C4B4]/60 text-xs space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#81A6C6]" /> Assigned Housekeeper
                    </label>
                    <select
                      value={task.assignedTo || 'Unassigned Staff'}
                      onChange={(e) =>
                        updateMutation.mutate({
                          roomId: task.roomId,
                          data: { cleaningStatus: task.cleaningStatus, assignedTo: e.target.value },
                        })
                      }
                      className="w-full h-10 rounded-xl border border-[#D2C4B4] bg-[#FAF5EF] px-3 text-xs text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                    >
                      {HOUSEKEEPERS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-[#D2C4B4]/60">
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setStatus(task.cleaningStatus);
                      setAssignedTo(task.assignedTo || 'Unassigned Staff');
                    }}
                    className="w-full h-11 rounded-xl bg-[#FAF5EF] hover:bg-[#AACDDC]/30 text-[#0F172A] font-bold text-xs transition border border-[#D2C4B4] flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                  >
                    Update Cleaning Status
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Housekeeping Update Modal */}
      {selectedTask && (
        <Modal
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title={`Update Housekeeping — Room ${selectedTask.roomNumber}`}
          size="md"
        >
          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Cleaning Status Stage *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              >
                <option value="CLEAN">CLEAN (Ready for Guest)</option>
                <option value="DIRTY">DIRTY (Needs Service)</option>
                <option value="IN_PROGRESS">IN_PROGRESS (Housekeeper Cleaning)</option>
                <option value="INSPECTION">INSPECTION (Manager Inspection Required)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Assigned Staff Member</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              >
                {HOUSEKEEPERS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="flex-1 h-11 rounded-xl bg-[#FAF5EF] text-[#0F172A] border border-[#D2C4B4] font-semibold text-sm hover:bg-[#AACDDC]/30 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate({ roomId: selectedTask.roomId, data: { cleaningStatus: status, assignedTo } })}
                disabled={updateMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Housekeeping Status'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
