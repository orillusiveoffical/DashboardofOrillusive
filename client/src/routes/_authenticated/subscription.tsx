import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, CheckCircle2, Layers, Clock } from 'lucide-react';
import { subscriptionService, PlanDetail } from '@/services/subscription.service';
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

  // Payment Form State
  const [cardHolder, setCardHolder] = useState('Tariq Mahmood');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('2028');
  const [cvc, setCvc] = useState('888');

  const { data: subData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionService.getSubscription,
    refetchInterval: 20000,
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
      setPaymentSuccess(`🎉 Payment Verified! Subscribed to ${res.planName} (Txn: ${res.transactionId})`);
      setCheckoutSession(null);
      setSelectedPlanId(null);
    },
    onError: (err: any) => {
      setPaymentError(err.message || 'Payment processing failed. Please verify card details.');
    },
  });

  const currentPlan = subData?.currentPlan;
  const otaUsage = subData?.otaUsage;
  const plansList: PlanDetail[] = Array.isArray(subData?.availablePlans) ? subData.availablePlans : [];

  const handleStartCheckout = (planId: string) => {
    setSelectedPlanId(planId);
    setPaymentSuccess(null);
    setPaymentError('');
    sessionMutation.mutate(planId);
  };

  const handlePayAndSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutSession) return;
    setPaymentError('');
    verifyPaymentMutation.mutate({
      sessionId: checkoutSession.sessionId,
      planId: checkoutSession.planId,
      cardHolder,
      cardNumber,
      expMonth,
      expYear,
      cvc,
    });
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
        </>
      ) : null}

      {/* Light Luxury Payment Gateway Checkout Modal */}
      {checkoutSession && (
        <Modal
          open={!!checkoutSession}
          onClose={() => {
            setCheckoutSession(null);
            setSelectedPlanId(null);
          }}
          title="Payment Checkout Gateway"
          size="lg"
        >
          <div className="space-y-5 text-sm text-[var(--text-primary)]">
            <p className="text-xs text-[var(--text-muted)] font-medium">
              Order Session: <span className="font-mono font-bold text-[#81A6C6]">{checkoutSession.sessionId}</span>
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

            {/* Credit Card Input Form */}
            <form onSubmit={handlePayAndSubscribe} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Cardholder Name *</label>
                <input
                  type="text"
                  required
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Credit / Debit Card Number *</label>
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-4 text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Exp Month</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value)}
                    className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-3 text-center text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Exp Year</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value)}
                    className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-3 text-center text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">CVC Code</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    className="w-full h-11 bg-white border border-[#D2C4B4] rounded-xl px-3 text-center text-sm text-[#0F172A] font-mono outline-none focus:ring-2 focus:ring-[#81A6C6]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-1">
                <span>🔒 256-bit SSL Encrypted Payment Gateway</span>
                <span>Powered by Stripe Sandbox</span>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutSession(null);
                    setSelectedPlanId(null);
                  }}
                  className="flex-1 h-12 rounded-xl bg-[#FAF5EF] text-[#0F172A] border border-[#D2C4B4] font-semibold text-sm hover:bg-[#AACDDC]/30 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyPaymentMutation.isPending}
                  className="flex-2 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-sm transition disabled:opacity-50 active:scale-[0.98]"
                >
                  {verifyPaymentMutation.isPending
                    ? 'Verifying Payment...'
                    : `Pay ${checkoutSession.totalPkr.toLocaleString()} PKR & Subscribe`}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
