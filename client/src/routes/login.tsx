import { createFileRoute, redirect, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { Building2, User, Sparkles, ArrowRight, ShieldCheck, Clock, CreditCard, AlertTriangle, Lock } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      expired: search.expired as string | undefined,
    };
  },
  beforeLoad: () => {
    if (localStorage.getItem('token')) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/login' });
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'demo' | 'paid' | 'login'>('demo');

  // Sign In Form State — MUST START 100% EMPTY
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Demo Registration State — MUST START 100% EMPTY
  const [demoHotelName, setDemoHotelName] = useState('');
  const [demoFirstName, setDemoFirstName] = useState('');
  const [demoLastName, setDemoLastName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoPassword, setDemoPassword] = useState('');

  // Paid Plan Checkout State — MUST START 100% EMPTY
  const [paidHotelName, setPaidHotelName] = useState('');
  const [paidFirstName, setPaidFirstName] = useState('');
  const [paidLastName, setPaidLastName] = useState('');
  const [paidEmail, setPaidEmail] = useState('');
  const [paidPassword, setPaidPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'BASIC' | 'MEDIUM' | 'PREMIUM'>('MEDIUM');

  // Checkout Modal / Step 2 State — MUST START 100% EMPTY
  const [paidStep, setPaidStep] = useState<'DETAILS' | 'PAYMENT'>('DETAILS');
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvcNumber, setCvcNumber] = useState('');

  // Status & Error States
  const [error, setError] = useState('');
  const [demoError, setDemoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Email format validation helper
  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim());
  };

  // 1. Sign In Handler
  const handleLoginSubmit = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError('');

    const email = customEmail !== undefined ? customEmail : loginEmail;
    const pass = customPass !== undefined ? customPass : loginPassword;

    // Validate Required Fields
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!pass) {
      setError('Password is required.');
      return;
    }

    setLoading(true);

    try {
      const res = await authService.login(email.trim(), pass);
      await queryClient.invalidateQueries({ queryKey: ['auth'] });

      if ((res.user.role as any) === 'SUPER_ADMIN') {
        navigate({ to: '/admin/saas' });
      } else {
        navigate({ to: '/dashboard' });
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'DEMO_EXPIRED') {
        setError('Your 3-day demo has expired. Subscribe to continue using Orillusive HMS.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Start 3-Day Demo Handler (72 Real Hours)
  const handleStartDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDemoError('');

    // Validate Required Demo Fields
    if (!demoHotelName.trim()) {
      setDemoError('Hotel / Property Name is required.');
      return;
    }
    if (!demoFirstName.trim()) {
      setDemoError('First Name is required.');
      return;
    }
    if (!demoLastName.trim()) {
      setDemoError('Last Name is required.');
      return;
    }
    if (!demoEmail.trim()) {
      setDemoError('Email Address is required.');
      return;
    }
    if (!isValidEmail(demoEmail)) {
      setDemoError('Please enter a valid email address.');
      return;
    }
    if (!demoPassword) {
      setDemoError('Password is required.');
      return;
    }

    setLoading(true);

    try {
      await authService.startDemo({
        hotelName: demoHotelName.trim(),
        firstName: demoFirstName.trim(),
        lastName: demoLastName.trim(),
        email: demoEmail.trim(),
        password: demoPassword,
      });

      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      navigate({ to: '/dashboard' });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err.message || 'Demo activation failed.';
      setDemoError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 3. Paid Order Creation (Step 1)
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate Required Details
    if (!paidHotelName.trim()) {
      setError('Hotel / Property Name is required.');
      return;
    }
    if (!paidFirstName.trim()) {
      setError('First Name is required.');
      return;
    }
    if (!paidLastName.trim()) {
      setError('Last Name is required.');
      return;
    }
    if (!paidEmail.trim()) {
      setError('Email Address is required.');
      return;
    }
    if (!isValidEmail(paidEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!paidPassword) {
      setError('Password is required.');
      return;
    }

    setLoading(true);

    try {
      const order = await authService.createPaidOrder({
        hotelName: paidHotelName.trim(),
        firstName: paidFirstName.trim(),
        lastName: paidLastName.trim(),
        email: paidEmail.trim(),
        password: paidPassword,
        planId: selectedPlan,
      });

      setPendingOrder(order);
      setCardHolder(`${paidFirstName.trim()} ${paidLastName.trim()}`);
      setPaidStep('PAYMENT');
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : err.message || 'Failed to initialize payment order.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Server-Side Payment Verification & Activation (Step 2)
  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingOrder) return;
    setError('');

    if (!cardHolder.trim()) {
      setError('Cardholder Name is required.');
      return;
    }
    if (!cardNumber.trim()) {
      setError('Card Number is required.');
      return;
    }
    if (!expMonth.trim() || !expYear.trim()) {
      setError('Card Expiration (MM/YY) is required.');
      return;
    }

    setVerifyingPayment(true);

    try {
      await authService.verifyPaidPayment({
        orderId: pendingOrder.orderId,
        cardHolder: cardHolder.trim(),
        cardNumber: cardNumber.trim(),
        expMonth: expMonth.trim(),
        expYear: expYear.trim(),
      });

      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      navigate({ to: '/dashboard' });
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : err.message || 'Server-side payment verification failed.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const isDev = import.meta.env.DEV;

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans transition-colors duration-200">
      {/* Left Branding Panel */}
      <div className="hidden flex-1 flex-col justify-between bg-[var(--bg-surface)] p-12 text-[var(--text-primary)] lg:flex border-r border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#81A6C6] shadow-sm">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">ORILLUSIVE</span>
            <p className="text-[10px] tracking-widest text-[#81A6C6] font-bold uppercase">HMS SaaS Platform</p>
          </div>
        </div>

        <div className="space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#AACDDC]/30 text-[var(--text-primary)] border border-[#81A6C6]/30 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#81A6C6]" /> Verified Server Authorization & 72h Demo
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-[var(--text-primary)] tracking-tight">
            Multi-Tenant Hotel PMS, OTA Sync & Payment Verification System
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
            Start a 72-hour trial or register with server-verified payment authorization. Database isolation and server-enforced demo expiration guaranteed.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--border)] text-xs">
            <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
              <div className="font-bold text-[var(--text-primary)]">BASIC</div>
              <div className="text-[#81A6C6] font-bold">5,000 PKR</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">Full HMS, 0 OTAs</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[#81A6C6] shadow-sm bg-[#AACDDC]/10">
              <div className="font-bold text-[var(--text-primary)]">MEDIUM</div>
              <div className="text-[#81A6C6] font-bold">12,000 PKR</div>
              <div className="text-[10px] text-[var(--text-primary)] font-semibold mt-1">Max 2 OTAs</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
              <div className="font-bold text-[var(--text-primary)]">PREMIUM</div>
              <div className="text-[#81A6C6] font-bold">15,000 PKR</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">Unlimited OTAs</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
          <span>© 2026 Orillusive Hotel Suite</span>
          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Server Security Active
          </span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-5 bg-[var(--bg-card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm">
          <div className="lg:hidden flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#81A6C6]">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-[var(--text-primary)] text-lg">Orillusive HMS SaaS</span>
          </div>

          {/* Expired Session Alert Banner */}
          {search?.expired === 'demo' && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 p-4 text-amber-900 dark:text-amber-200 text-xs font-semibold space-y-1">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-600" /> Demo Expired
              </div>
              <p>Your 3-day demo has expired. Subscribe to continue using Orillusive HMS.</p>
            </div>
          )}

          {search?.expired === 'subscription' && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/50 p-4 text-rose-900 dark:text-rose-200 text-xs font-semibold space-y-1">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Subscription Expired
              </div>
              <p>Your subscription has expired. Please choose a plan to continue using Orillusive HMS.</p>
            </div>
          )}

          {/* 3 Main Flow Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-[var(--bg-surface)] p-1.5 rounded-2xl border border-[var(--border)] text-xs font-bold text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('demo');
                setError('');
                setDemoError('');
              }}
              className={`py-2 px-1 rounded-xl transition ${
                activeTab === 'demo'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-extrabold border border-[var(--border)]'
                  : 'hover:text-[var(--text-primary)]'
              }`}
            >
              3-Day Demo
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('paid');
                setError('');
                setDemoError('');
              }}
              className={`py-2 px-1 rounded-xl transition ${
                activeTab === 'paid'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-extrabold border border-[var(--border)]'
                  : 'hover:text-[var(--text-primary)]'
              }`}
            >
              Paid Checkout
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError('');
                setDemoError('');
              }}
              className={`py-2 px-1 rounded-xl transition ${
                activeTab === 'login'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-extrabold border border-[var(--border)]'
                  : 'hover:text-[var(--text-primary)]'
              }`}
            >
              Sign In
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 px-4 py-3 text-xs text-rose-700 dark:text-rose-300 font-semibold">
              {error}
            </div>
          )}

          {/* TAB 1: START 3-DAY FREE DEMO */}
          {activeTab === 'demo' && (
            <form onSubmit={handleStartDemoSubmit} className="space-y-3.5 text-xs">
              <div className="rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 p-3 text-[11px] text-indigo-900 dark:text-indigo-200 font-medium flex items-start gap-2">
                <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">72-Hour Full Trial:</span> Provides 3 real days (72 hours elapsed server time). 1 email = 1 demo ever.
                </div>
              </div>

              {demoError && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 p-3 text-xs text-rose-700 dark:text-rose-300 font-semibold space-y-2">
                  <div>{demoError}</div>
                  {demoError.includes('already used') && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('paid');
                        setPaidEmail(demoEmail);
                        setDemoError('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
                    >
                      Choose Subscription Plan &rarr;
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[var(--text-secondary)] font-semibold mb-1">Hotel / Property Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunset Vista Hotel"
                  value={demoHotelName}
                  onChange={(e) => setDemoHotelName(e.target.value)}
                  className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[var(--text-secondary)] font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Adnan"
                    value={demoFirstName}
                    onChange={(e) => setDemoFirstName(e.target.value)}
                    className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Siddiqui"
                    value={demoLastName}
                    onChange={(e) => setDemoLastName(e.target.value)}
                    className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. adnan@example.com"
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-semibold mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={demoPassword}
                  onChange={(e) => setDemoPassword(e.target.value)}
                  className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {loading ? 'Activating 72-Hour Demo...' : 'Start 3-Day Free Demo'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 2: PAID PLAN CHECKOUT & SERVER VERIFICATION */}
          {activeTab === 'paid' && (
            <div className="space-y-3 text-xs">
              {paidStep === 'DETAILS' ? (
                <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[var(--text-secondary)] font-semibold mb-1">Select SaaS Subscription Tier</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['BASIC', 'MEDIUM', 'PREMIUM'] as const).map((plan) => (
                        <button
                          key={plan}
                          type="button"
                          onClick={() => setSelectedPlan(plan)}
                          className={`p-2 rounded-xl border text-center transition ${
                            selectedPlan === plan
                              ? 'border-[#81A6C6] bg-[#AACDDC]/30 text-[var(--text-primary)] font-bold ring-2 ring-[#81A6C6]/30'
                              : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-slate-400'
                          }`}
                        >
                          <div className="font-extrabold text-[11px]">{plan}</div>
                          <div className="text-[10px] text-[#81A6C6] font-bold">
                            {plan === 'BASIC' ? '5,000' : plan === 'MEDIUM' ? '12,000' : '15,000'} PKR
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] font-semibold mb-1">Hotel / Property Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Imperial Grand Resort"
                      value={paidHotelName}
                      onChange={(e) => setPaidHotelName(e.target.value)}
                      className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[var(--text-secondary)] font-semibold mb-1">First Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Kamran"
                        value={paidFirstName}
                        onChange={(e) => setPaidFirstName(e.target.value)}
                        className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] font-semibold mb-1">Last Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Khan"
                        value={paidLastName}
                        onChange={(e) => setPaidLastName(e.target.value)}
                        className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] font-semibold mb-1">Owner Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. owner@imperial.com"
                      value={paidEmail}
                      onChange={(e) => setPaidEmail(e.target.value)}
                      className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] font-semibold mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="Enter password"
                      value={paidPassword}
                      onChange={(e) => setPaidPassword(e.target.value)}
                      className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-[#0F172A] hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {loading ? 'Creating Order...' : 'Continue to Secure Checkout'}
                    <CreditCard className="w-4 h-4 text-[#81A6C6]" />
                  </button>
                </form>
              ) : (
                /* Step 2: Payment Verification Step */
                <form onSubmit={handleVerifyPayment} className="space-y-3.5 text-xs bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border)]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                    <div>
                      <div className="font-extrabold text-sm text-[var(--text-primary)]">Order: {pendingOrder?.orderId}</div>
                      <div className="text-[11px] text-[var(--text-muted)] font-semibold">{pendingOrder?.selectedPlan} Plan ({pendingOrder?.amount?.toLocaleString()} PKR/mo)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaidStep('DETAILS')}
                      className="text-[11px] text-[#81A6C6] font-bold hover:underline"
                    >
                      &larr; Back
                    </button>
                  </div>

                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 p-2.5 text-[11px] text-emerald-900 dark:text-emerald-200 font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    Server Verification Mode Active. Payment status must be verified server-side.
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] font-semibold mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="Name on card"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] font-semibold mb-1">Card Number</label>
                    <input
                      type="text"
                      placeholder="4242 •••• •••• 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[var(--text-secondary)] font-semibold mb-1">Expires (MM/YY)</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="MM"
                          value={expMonth}
                          onChange={(e) => setExpMonth(e.target.value)}
                          className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-2 text-center text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none"
                        />
                        <input
                          type="text"
                          placeholder="YY"
                          value={expYear}
                          onChange={(e) => setExpYear(e.target.value)}
                          className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-2 text-center text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] font-semibold mb-1">CVC / CVV</label>
                      <input
                        type="password"
                        placeholder="CVC"
                        value={cvcNumber}
                        onChange={(e) => setCvcNumber(e.target.value)}
                        className="w-full h-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 text-center text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={verifyingPayment}
                    className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {verifyingPayment ? 'Verifying Payment Server-Side...' : 'Verify Payment & Activate Account'}
                    <Lock className="w-4 h-4 text-emerald-200" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: SIGN IN */}
          {activeTab === 'login' && (
            <form onSubmit={(e) => handleLoginSubmit(e)} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] font-semibold mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full h-11 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-semibold mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full h-11 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-semibold outline-none focus:ring-2 focus:ring-[#81A6C6]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {loading ? 'Authenticating...' : 'Sign In to HMS Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Explicit Development-Only Quick Demo Account Button */}
              {isDev && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={(e) => handleLoginSubmit(e, 'owner@orillusive.com', 'password123')}
                    disabled={loading}
                    className="w-full py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[#AACDDC]/20 border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-[#81A6C6]" />
                    [DEV ONLY] Quick Demo Owner Login
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
