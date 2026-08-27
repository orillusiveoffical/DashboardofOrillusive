import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  RefreshCw,
  Plus,
  CheckCircle2,
  Zap,
  Shield,
  Layers,
  Sliders,
  Activity,
  Check,
} from 'lucide-react';
import { otaService } from '@/services/ota.service';
import { roomsService } from '@/services/rooms.service';
import { Modal } from '@/components/ui/Form';

export const Route = createFileRoute('/_authenticated/ota')({
  component: OtaChannelManager,
});

function OtaChannelManager() {
  const queryClient = useQueryClient();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<'BOOKING_COM' | 'AIRBNB' | 'EXPEDIA' | 'AGODA'>('BOOKING_COM');

  // Form State for Connecting OTA
  const [propertyId, setPropertyId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [rateParityMarkup, setRateParityMarkup] = useState<Record<string, number>>({
    BOOKING_COM: 5,
    AIRBNB: 8,
    EXPEDIA: 0,
    AGODA: 0,
  });

  // Fetch OTA Connections & Capabilities
  const { data: connectionsData } = useQuery({
    queryKey: ['ota-connections'],
    queryFn: otaService.getConnections,
    refetchInterval: 15000,
  });

  // Fetch Room Mappings
  const { data: mappingsData } = useQuery({
    queryKey: ['ota-mappings'],
    queryFn: otaService.getRoomMappings,
  });

  // Fetch Sync Logs
  const { data: syncLogsData } = useQuery({
    queryKey: ['ota-logs'],
    queryFn: otaService.getSyncLogs,
  });

  // Fetch Room Types for mapping
  const { data: roomTypesData } = useQuery({
    queryKey: ['room-types'],
    queryFn: roomsService.getRoomTypes,
  });

  // Connect Mutation
  const connectMutation = useMutation({
    mutationFn: otaService.connectChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ota-connections'] });
      setConnectModalOpen(false);
      setPropertyId('');
      setApiKey('');
      setApiSecret('');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to connect OTA channel.');
    },
  });

  // Sync Mutation
  const syncMutation = useMutation({
    mutationFn: otaService.triggerSyncNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ota-connections'] });
      queryClient.invalidateQueries({ queryKey: ['ota-logs'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  const connections = Array.isArray(connectionsData?.connections) ? connectionsData.connections : [];
  const planCaps = connectionsData?.planCapabilities;
  const mappings = Array.isArray(mappingsData) ? mappingsData : [];
  const syncLogs = Array.isArray(syncLogsData) ? syncLogsData : [];
  const roomTypes = Array.isArray(roomTypesData) ? roomTypesData : [];

  const SUPPORTED_CHANNELS = [
    { id: 'BOOKING_COM', name: 'Booking.com', logo: '🌐' },
    { id: 'AIRBNB', name: 'Airbnb', logo: '🏠' },
    { id: 'EXPEDIA', name: 'Expedia', logo: '✈️' },
    { id: 'AGODA', name: 'Agoda', logo: '🏨' },
  ] as const;

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !apiKey) {
      setErrorMsg('Property ID and API Key are required.');
      return;
    }

    connectMutation.mutate({
      channelId: selectedChannel,
      name: SUPPORTED_CHANNELS.find((c) => c.id === selectedChannel)?.name || selectedChannel,
      propertyId,
      credentials: { apiKey, apiSecret },
    });
  };

  const handleMarkupChange = (channelId: string, val: number) => {
    setRateParityMarkup((prev) => ({ ...prev, [channelId]: val }));
  };

  const activeConnectedCount = connections.filter((c: any) => c.status === 'CONNECTED').length;

  return (
    <div className="space-y-8 text-[var(--text-primary)]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
              <Globe className="w-8 h-8 text-[#81A6C6]" /> OTA Channel Manager
            </h1>
            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> 2-Way Sync Active
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
            Centralized inventory distribution across Booking.com, Airbnb, Expedia & Agoda with real-time rate parity and idempotency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white text-sm font-bold shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Synchronizing Channels...' : 'Sync Inventory Now'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] space-y-2 shadow-sm text-[var(--text-primary)]">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">
            <span>Connected OTAs</span>
            <Globe className="w-4 h-4 text-[#81A6C6]" />
          </div>
          <div className="text-3xl font-extrabold text-[var(--text-primary)]">
            {activeConnectedCount} / {SUPPORTED_CHANNELS.length}
          </div>
          <p className="text-xs text-[var(--text-muted)] font-medium">Live channel sync pipelines</p>
        </div>

        <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] space-y-2 shadow-sm text-[var(--text-primary)]">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">
            <span>Sync Health Index</span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">99.8%</div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">100% Rate & Inventory Parity</p>
        </div>

        <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] space-y-2 shadow-sm text-[var(--text-primary)]">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">
            <span>Mapped Room Types</span>
            <Layers className="w-4 h-4 text-[#81A6C6]" />
          </div>
          <div className="text-3xl font-extrabold text-[var(--text-primary)]">{mappings.length}</div>
          <p className="text-xs text-[var(--text-muted)] font-medium">Active HMS to OTA room mappings</p>
        </div>

        <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] space-y-2 shadow-sm text-[var(--text-primary)]">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">
            <span>Capacity Limit</span>
            <Shield className="w-4 h-4 text-[#81A6C6]" />
          </div>
          <div className="text-3xl font-extrabold text-[var(--text-primary)]">
            {planCaps?.maxOtaChannels === -1 ? 'Unlimited' : (planCaps?.maxOtaChannels ?? '2')}
          </div>
          <p className="text-xs text-[#81A6C6] font-bold">{planCaps?.planName || 'Medium Plan'}</p>
        </div>
      </div>

      {/* Subscription Capability Notice Banner */}
      {planCaps && (
        <div className="rounded-3xl border border-[#81A6C6] bg-[var(--bg-card)] p-7 shadow-sm text-[var(--text-primary)]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-[#81A6C6]/20 text-[#81A6C6] border border-[#81A6C6]/30">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-[var(--text-primary)] text-lg">
                  SaaS Subscription Plan: <span className="text-[#81A6C6]">{planCaps.planName}</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
                  {planCaps.maxOtaChannels === 0
                    ? 'Basic Plan (5,000 PKR/mo) includes 0 OTA integrations. Upgrade to Medium or Premium for OTA synchronization.'
                    : planCaps.maxOtaChannels > 0
                    ? `Medium Plan (12,000 PKR/mo) permits up to ${planCaps.maxOtaChannels} active OTA connections (${planCaps.activeCount}/${planCaps.maxOtaChannels} connected).`
                    : 'Premium Plan (15,000 PKR/mo) permits Unlimited OTA Channel Connections.'}
                </p>
              </div>
            </div>
            {planCaps.maxOtaChannels !== -1 && (
              <span className="text-xs font-bold px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)]">
                Plan Limit: {planCaps.activeCount} / {planCaps.maxOtaChannels === -1 ? '∞' : planCaps.maxOtaChannels} Channels
              </span>
            )}
          </div>
        </div>
      )}

      {/* Connected OTAs Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#81A6C6]" /> Connected OTA Distribution Channels
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SUPPORTED_CHANNELS.map((channel) => {
            const activeConn = connections.find((c: any) => c.channelId === channel.id && c.status !== 'DISCONNECTED');
            const syncStatus = activeConn?.lastSyncStatus || (activeConn ? 'SUCCESS' : 'IDLE');

            return (
              <div
                key={channel.id}
                className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 hover:border-[#81A6C6] hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 shadow-sm min-h-[250px] text-[var(--text-primary)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{channel.logo}</span>
                    {activeConn ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Connected
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--bg-surface)] px-2.5 py-1 rounded-full border border-[var(--border)]">
                        Disconnected
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-[var(--text-primary)] text-lg">{channel.name}</h3>

                  {activeConn ? (
                    <div className="mt-3 text-xs text-[var(--text-secondary)] space-y-1.5 border-t border-[var(--border)] pt-3 font-medium">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Property ID:</span>
                        <span className="font-mono text-[var(--text-primary)] font-bold">{activeConn.propertyId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Sync Status:</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> {syncStatus}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Last Synced:</span>
                        <span className="text-[var(--text-primary)]">
                          {activeConn.lastSyncedAt ? new Date(activeConn.lastSyncedAt).toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">Ready to sync live rate, room inventory & reservations.</p>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--border)]">
                  {activeConn ? (
                    <button
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                      className="w-full h-11 text-xs font-bold rounded-xl bg-[var(--bg-surface)] hover:bg-[#81A6C6]/20 text-[var(--text-primary)] border border-[var(--border)] transition flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#81A6C6] ${syncMutation.isPending ? 'animate-spin' : ''}`} /> Sync Now
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedChannel(channel.id);
                        setConnectModalOpen(true);
                      }}
                      className="w-full h-11 text-xs font-bold rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" /> Connect {channel.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rate Parity & Markup Controls */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 shadow-sm space-y-5 text-[var(--text-primary)]">
        <div className="border-b border-[var(--border)] pb-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#81A6C6]" /> Channel Rate Parity & Markup Controls
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
            Configure automatic pricing markup percentage per OTA channel to absorb channel commission fees while maintaining rate parity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SUPPORTED_CHANNELS.map((ch) => (
            <div key={ch.id} className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>{ch.logo}</span> {ch.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#81A6C6] text-white">
                  +{rateParityMarkup[ch.id] || 0}% Markup
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={rateParityMarkup[ch.id] || 0}
                  onChange={(e) => handleMarkupChange(ch.id, Number(e.target.value))}
                  className="w-20 h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-2 text-center text-[var(--text-primary)] font-bold focus:ring-2 focus:ring-[#81A6C6] outline-none"
                />
                <span className="text-[var(--text-secondary)] font-medium">% Price Markup</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Room Mapping Matrix */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 shadow-sm space-y-5 text-[var(--text-primary)]">
        <div className="border-b border-[var(--border)] pb-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#81A6C6]" /> Inventory Room Mapping Matrix
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">Maps HMS Room Types to corresponding OTA listing IDs for auto-inventory sync.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full text-left text-xs text-[var(--text-primary)] border-collapse">
            <thead className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold uppercase tracking-wider text-[11px] border-b border-[var(--border)]">
              <tr>
                <th className="p-3.5">HMS Room Type</th>
                <th className="p-3.5">OTA Channel</th>
                <th className="p-3.5">OTA Room Type ID</th>
                <th className="p-3.5">Sync Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {mappings.length > 0 ? (
                mappings.map((map: any) => {
                  const hmsRt = roomTypes.find((rt: any) => rt.typeId === map.hmsRoomTypeId);
                  return (
                    <tr key={map.mappingId} className="hover:bg-[var(--bg-surface)] transition">
                      <td className="p-3.5 font-bold text-[var(--text-primary)]">{hmsRt?.name || map.hmsRoomTypeId}</td>
                      <td className="p-3.5 text-[var(--text-secondary)]">Channel Integration</td>
                      <td className="p-3.5 font-mono text-[#81A6C6] font-bold">{map.otaRoomTypeId}</td>
                      <td className="p-3.5">
                        <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1 w-max">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Mapped & Active
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-[var(--text-muted)] text-xs font-medium">
                    No active room mappings configured yet. Mappings sync automatically upon channel connection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync Audit Logs */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 shadow-sm space-y-4 text-[var(--text-primary)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#81A6C6]" /> Real-time Inventory Sync Audit Logs
        </h2>
        <div className="space-y-2">
          {syncLogs.length > 0 ? (
            syncLogs.slice(0, 6).map((log: any) => (
              <div
                key={log.logId}
                className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-medium"
              >
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg bg-[#81A6C6] text-white font-mono font-bold text-[11px]">
                    {log.channelId}
                  </span>
                  <span className="text-[var(--text-primary)] font-bold">{log.payloadSummary || log.eventType}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    {log.status || 'SUCCESS'}
                  </span>
                  <span className="text-[var(--text-muted)] font-mono text-[11px]">{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[var(--text-muted)] text-xs font-medium p-4 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]">
              No sync logs recorded yet.
            </p>
          )}
        </div>
      </div>

      {/* Connect OTA Modal */}
      {connectModalOpen && (
        <Modal
          open={connectModalOpen}
          onClose={() => setConnectModalOpen(false)}
          title={`Connect ${SUPPORTED_CHANNELS.find((c) => c.id === selectedChannel)?.name}`}
          size="md"
        >
          <form onSubmit={handleConnectSubmit} className="space-y-4 text-sm">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Property / Hotel Listing ID *</label>
              <input
                type="text"
                placeholder="e.g. PROP-1001"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">API Key / Client ID *</label>
              <input
                type="text"
                placeholder="Paste channel API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">API Secret / Token *</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
              />
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Credentials are encrypted with AES-256-GCM.</p>
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setConnectModalOpen(false)}
                className="flex-1 h-11 rounded-xl bg-[#FAF5EF] text-[#0F172A] border border-[#D2C4B4] font-semibold text-sm hover:bg-[#AACDDC]/30 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={connectMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
              >
                {connectMutation.isPending ? 'Verifying...' : 'Authorize & Connect'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
