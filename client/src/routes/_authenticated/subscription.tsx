import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, CheckCircle2, Layers, Clock, FileText, Printer, ShieldCheck, ExternalLink } from 'lucide-react';
import { subscriptionService, PlanDetail, Invoice } from '@/services/subscription.service';
import { Modal } from '@/components/ui/Form';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export const Route = createFileRoute('/_authenticated/subscription')({
  component: SubscriptionBillingPage,
});

function SubscriptionBillingPage() {
  const queryClient = useQueryClient();
  const { accountType, demoExpiresAt, isDemo } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<any | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string>('');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { data: subData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionService.getSubscription,
    refetchInterval: 20000,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: subscriptionService.getInvoices,
  });

  const sessionMutation = useMutation({
    mutationFn: subscriptionService.createCheckoutSession,
    onSuccess: (session) => {
      setCheckoutSession(session);
      setPaymentError('');
    },
    onError: (err: any) => {
      setPaymentError(err.message || 'Failed to initiate checkout session.');
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: subscriptionService.verifyCheckout,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setPaymentSuccess(`🎉 Payment Verified! Subscribed to ${res.planName} (Order Ref: ${res.orderId || res.transactionId})`);
      setCheckoutSession(null);
      setSelectedPlanId(null);
    },
    onError: (err: any) => {
      setPaymentError(err.message || 'Payment processing failed or not yet confirmed by Safepay.');
    },
  });

  // Handle Return Callback from Safepay (e.g. ?payment=success&orderId=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const orderId = urlParams.get('orderId') || urlParams.get('order_id') || urlParams.get('beacon');
      const trackerToken = urlParams.get('tracker') || urlParams.get('beacon');

      if (paymentStatus === 'success' && (orderId || trackerToken)) {
        verifyPaymentMutation.mutate({
          orderId: orderId || undefined,
          trackerToken: trackerToken || undefined,
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
        setPaymentError('Payment was cancelled or declined on Safepay. Your subscription was not activated.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const currentPlan = subData?.currentPlan;
  const otaUsage = subData?.otaUsage;
  const plansList: PlanDetail[] = Array.isArray(subData?.availablePlans) ? subData.availablePlans : [];

  const handleStartCheckout = (planId: string) => {
    setSelectedPlanId(planId);
    setPaymentSuccess(null);
    setPaymentError('');
    sessionMutation.mutate(planId);
  };

  const handleProceedToSafepay = () => {
    if (!checkoutSession || !checkoutSession.safepayCheckoutUrl) return;
    setIsRedirecting(true);
    // Immediate browser redirection to Safepay hosted checkout
    window.location.href = checkoutSession.safepayCheckoutUrl;
  };

  return (
    <div className="space-y-8 text-[var(--text-primary)]">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-[#81A6C6]" /> SaaS Subscription & Billing
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
            Manage active subscription plan tier, PKR billing, OTA channel capacity, and payment gateways.
          </p>
        </div>
      </div>

      {isDemo && (
        <div className="p-5 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-semibold space-y-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-extrabold text-sm">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" /> 3-Day Free Demo Account
          </div>
          <p>
            Your account is currently using a 72-hour trial. Demo expiration is enforced server-side.
            {demoExpiresAt && (
              <span className="font-bold ml-1">
                Expires on: {new Date(demoExpiresAt).toLocaleString()}
              </span>
            )}
          </p>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
            Select a subscription plan below and verify payment to upgrade to an official Paid Subscription.
          </p>
        </div>
      )}

      {paymentSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{paymentSuccess}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-[var(--text-muted)] text-sm font-medium">Loading subscription status...</div>
      ) : isError ? (
        <div className="p-10 text-center space-y-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm text-[var(--text-primary)]">
          <p className="text-base font-bold text-rose-600">Unable to load subscription details.</p>
          <p className="text-xs text-[var(--text-muted)]">{(error as Error)?.message || 'Check server connection.'}</p>
          <button onClick={() => refetch()} className="px-5 py-2.5 rounded-xl bg-[#81A6C6] text-sm font-bold text-white shadow-sm">
            Retry Load
          </button>
        </div>
      ) : subData ? (
        <>
          {/* Active Plan Overview Surface Banner */}
          <div className="rounded-3xl border border-[#81A6C6] bg-[var(--bg-card)] p-7 shadow-sm space-y-4 text-[var(--text-primary)]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  Account Status: {accountType === 'DEMO' ? '3-DAY DEMO' : 'ACTIVE PAID'}
                </span>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mt-2">
                  Current Plan: <span className="text-[#81A6C6]">{currentPlan?.name || 'Basic'}</span>
                </h2>
                <p className="text-lg font-bold text-[var(--text-primary)] mt-1">
                  {(currentPlan?.pricePkr ?? 0).toLocaleString()} PKR <span className="text-xs text-[var(--text-muted)] font-normal">/ month</span>
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs space-y-1.5 min-w-[220px]">
                <div className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px]">OTA Connection Capacity</div>
                <div className="text-xl font-extrabold text-[var(--text-primary)]">
                  {otaUsage?.activeConnections ?? 0} / {otaUsage?.maxAllowed === -1 ? 'Unlimited' : (otaUsage?.maxAllowed ?? 0)} Channels
                </div>
              </div>
            </div>
          </div>

          {/* Plan Cards Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#81A6C6]" /> Available SaaS Subscription Plans
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {plansList.map((plan: PlanDetail) => {
                const isCurrent = plan.planId === currentPlan?.planId;
                return (
                  <div
                    key={plan.planId}
                    className={cn(
                      'rounded-3xl border p-7 flex flex-col justify-between space-y-6 transition-all duration-200 shadow-sm min-h-[360px] text-[var(--text-primary)]',
                      isCurrent
                        ? 'border-[#81A6C6] bg-[var(--bg-surface)] ring-2 ring-[#81A6C6]'
                        : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[#81A6C6]'
                    )}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-[var(--text-primary)] text-xl">{plan.name}</h3>
                        {isCurrent && (
                          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                            Current Tier
                          </span>
                        )}
                      </div>

                      <div className="text-3xl font-extrabold text-[var(--text-primary)]">
                        {plan.pricePkr.toLocaleString()} <span className="text-xs text-[var(--text-muted)] font-normal">PKR/mo</span>
                      </div>

                      <div className="text-xs font-bold text-[#81A6C6]">
                        {plan.maxOtaChannels === 0
                          ? '0 OTA Integrations'
                          : plan.maxOtaChannels === -1
                          ? 'Unlimited OTA Integrations'
                          : `Max ${plan.maxOtaChannels} OTA Integrations`}
                      </div>

                      <ul className="space-y-2.5 text-xs text-[var(--text-secondary)] border-t border-[var(--border)] pt-4 font-medium">
                        {(plan.features ?? []).map((feat, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-[#81A6C6] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => handleStartCheckout(plan.planId)}
                        disabled={sessionMutation.isPending && selectedPlanId === plan.planId}
                        className="w-full h-12 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white text-sm font-bold transition shadow-sm disabled:opacity-50 active:scale-[0.98]"
                      >
                        {sessionMutation.isPending && selectedPlanId === plan.planId
                          ? 'Initiating Checkout...'
                          : `Subscribe to ${plan.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invoices & Billing History Section */}
          <div className="space-y-4 pt-4">
            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#81A6C6]" /> Invoices & Billing History
            </h2>

            {invoices.length === 0 ? (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-xs text-[var(--text-muted)] font-medium">
                No invoices generated yet. Invoices appear automatically after completed subscription payments.
              </div>
            ) : (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg-surface)] text-[var(--text-muted)] font-bold uppercase tracking-wider border-b border-[var(--border)]">
                      <tr>
                        <th className="py-4 px-6">Invoice #</th>
                        <th className="py-4 px-6">Date</th>
                        <th className="py-4 px-6">Plan Description</th>
                        <th className="py-4 px-6">Amount (PKR)</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)] font-medium">
                      {invoices.map((inv: Invoice) => (
                        <tr key={inv.invoiceId} className="hover:bg-[var(--bg-surface)]/50 transition">
                          <td className="py-4 px-6 font-mono font-bold text-[var(--text-primary)]">{inv.invoiceNumber}</td>
                          <td className="py-4 px-6">{new Date(inv.paidAt || inv.createdAt).toLocaleDateString()}</td>
                          <td className="py-4 px-6 font-semibold text-[var(--text-primary)]">{inv.planName} SaaS Plan</td>
                          <td className="py-4 px-6 font-extrabold text-[var(--text-primary)]">{(inv.totalAmount || inv.amount).toLocaleString()} PKR</td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3" /> PAID
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => setViewingInvoice(inv)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#81A6C6]/15 hover:bg-[#81A6C6]/30 text-[#81A6C6] dark:text-[#AACDDC] font-bold text-xs transition"
                            >
                              View Tax Invoice
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Safepay Payment Redirection Modal */}
      {checkoutSession && (
        <Modal
          open={!!checkoutSession}
          onClose={() => {
            setCheckoutSession(null);
            setSelectedPlanId(null);
            setIsRedirecting(false);
          }}
          title="Payment Checkout Gateway"
          size="lg"
        >
          <div className="space-y-5 text-sm text-[var(--text-primary)]">
            <p className="text-xs text-[var(--text-muted)] font-medium">
              Order Session: <span className="font-mono font-bold text-[#81A6C6]">{checkoutSession.orderId || checkoutSession.sessionId}</span>
            </p>

            {/* Order Breakdown Box */}
            <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] p-5 space-y-2 text-xs font-medium text-[var(--text-primary)]">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Selected Plan</span>
                <span className="font-bold text-[var(--text-primary)]">{checkoutSession.planName}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Monthly Plan Fee</span>
                <span>{checkoutSession.pricePkr.toLocaleString()} PKR</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>GST Tax (16%)</span>
                <span>{checkoutSession.taxAmountPkr.toLocaleString()} PKR</span>
              </div>
              <div className="border-t border-[var(--border)] pt-3 flex justify-between text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                <span>Total Amount Due</span>
                <span>{checkoutSession.totalPkr.toLocaleString()} PKR</span>
              </div>
            </div>

            {paymentError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {paymentError}
              </div>
            )}

            {/* Safepay Redirect Information Box */}
            <div className="rounded-2xl bg-blue-50/50 dark:bg-slate-800/40 border border-blue-200/60 dark:border-slate-700 p-4 space-y-2 text-xs text-[var(--text-secondary)]">
              <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Secure Hosted Safepay Checkout
              </div>
              <p className="leading-relaxed text-[11px]">
                You will be redirected to Safepay's official PCI-DSS compliant checkout portal to complete your PKR payment securely using Debit/Credit Card, Bank Transfer, or Mobile Wallets.
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-1">
              <span>🔒 256-bit SSL Encrypted Payment Gateway</span>
              <span>Powered by Safepay Payments (PKR)</span>
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setCheckoutSession(null);
                  setSelectedPlanId(null);
                  setIsRedirecting(false);
                }}
                className="flex-1 h-12 rounded-xl bg-[#FAF5EF] text-[#0F172A] border border-[#D2C4B4] font-semibold text-sm hover:bg-[#AACDDC]/30 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToSafepay}
                disabled={isRedirecting}
                className="flex-2 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-sm transition disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isRedirecting ? (
                  'Redirecting to Safepay...'
                ) : (
                  <>
                    <span>Pay {checkoutSession.totalPkr.toLocaleString()} PKR on Safepay</span>
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Official Tax Invoice Viewer Modal */}
      {viewingInvoice && (
        <Modal
          open={!!viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          title="Official Tax Invoice & Receipt"
          size="lg"
        >
          <div className="space-y-6 text-xs text-[var(--text-primary)]">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-[var(--border)] pb-5">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">ORILLUSIVE</h2>
                <p className="text-xs text-[var(--text-secondary)] font-semibold mt-0.5">Software Studio / SaaS Platform</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">support@orillusive.com</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" /> PAID
                </span>
                <p className="font-mono font-extrabold text-sm text-[var(--text-primary)] mt-2">{viewingInvoice.invoiceNumber}</p>
                <p className="text-[11px] text-[var(--text-muted)]">Date: {new Date(viewingInvoice.paidAt || viewingInvoice.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Bill To & Property Details */}
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-[var(--bg-surface)] p-4 border border-[var(--border)]">
              <div>
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Billed To</div>
                <div className="font-bold text-sm text-[var(--text-primary)] mt-1">{viewingInvoice.hotelName}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">{viewingInvoice.customerName}</div>
                <div className="text-xs text-[var(--text-muted)]">{viewingInvoice.customerEmail}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Payment Gateway</div>
                <div className="font-semibold text-xs text-[var(--text-primary)] mt-1">Safepay Gateway (PKR)</div>
                <div className="text-[10px] font-mono text-[var(--text-muted)] mt-1 break-all">Ref: {viewingInvoice.providerTransactionId}</div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-surface)] text-[var(--text-muted)] font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Item & Description</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-medium">
                  <tr>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[var(--text-primary)]">{viewingInvoice.planName} SaaS Subscription</div>
                      <div className="text-[11px] text-[var(--text-muted)]">1 Month PMS, OTA Channel Manager & Database License</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[var(--text-primary)]">{viewingInvoice.amount.toLocaleString()} PKR</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-[var(--text-muted)]">GST Sales Tax (16%)</td>
                    <td className="py-2.5 px-4 text-right text-[var(--text-muted)]">{viewingInvoice.taxAmount.toLocaleString()} PKR</td>
                  </tr>
                  <tr className="bg-[var(--bg-surface)] font-extrabold text-sm text-[var(--text-primary)]">
                    <td className="py-3 px-4">Total Amount Paid</td>
                    <td className="py-3 px-4 text-right text-emerald-700 dark:text-emerald-400">{viewingInvoice.totalAmount.toLocaleString()} PKR</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-[var(--text-muted)]">🔒 Verified Electronic Receipt</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--border)] border border-[var(--border)] font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="px-5 py-2 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-xs shadow-xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
