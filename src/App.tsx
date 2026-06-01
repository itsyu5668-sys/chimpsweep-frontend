/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Mail,
  Layers,
  Trash2,
  Database,
  X,
  CreditCard,
  Check,
  Lock,
  Info,
  ChevronDown,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Settings,
  AlertCircle,
  TrendingDown,
  Power,
  Terminal,
  Activity,
  History as HistoryIcon
} from 'lucide-react';
import { PageRoute, DashboardTab, UserSubscription, AudienceSummary, CleanupRun } from './types';
import { InteractiveSavingsCalculator } from './components/InteractiveSavingsCalculator';

// Let's declare our fallback default database state
const INITIAL_USER: UserSubscription = {
  email: 'newsletter-editor@example.com',
  plan: 'none',
  status: 'Active',
  renewalDate: 'July 1, 2026',
  mailchimpConnected: false
};

const INITIAL_SUMMARY: AudienceSummary = {
  unsubscribed_count: 1420,
  bounced_count: 380,
  duplicate_count: 180,
  estimated_savings_cents: 2950,
  health_score: 54
};

const INITIAL_HISTORY: CleanupRun[] = [
  {
    id: 'run-321',
    date: 'May 15, 2026 at 10:30 AM',
    timestamp: 1778927400000,
    type: 'Manual',
    count: 1200,
    savingsCents: 2000,
    status: 'Completed'
  },
  {
    id: 'run-320',
    date: 'Apr 08, 2026 at 02:15 AM',
    timestamp: 1775614500000,
    type: 'Auto (weekly)',
    count: 450,
    savingsCents: 850,
    status: 'Completed'
  }
];

export default function App() {
  // ─── CRITICAL: URL-aware route init ───────────────────────────────────────
  // On load, check the real browser URL path first.
  // This handles the Mailchimp OAuth callback which lands at /auth/success?token=...
  // and any direct navigation to /privacy, /terms, etc.
  const [route, setRoute] = useState<PageRoute>(() => {
    const path = window.location.pathname.replace(/^\//, '') || 'landing';
    const knownRoutes: PageRoute[] = [
      'landing', 'oauth_mailchimp', 'auth_success', 'auth_error',
      'pricing', 'checkout', 'stripe_portal', 'dashboard', 'privacy', 'terms'
    ];
    if (knownRoutes.includes(path as PageRoute)) {
      return path as PageRoute;
    }
    // Fallback: use localStorage if path is not a known route (e.g. running on / in dev)
    const token = localStorage.getItem('bs_token');
    const savedRoute = localStorage.getItem('bs_route');
    if (!token) return 'landing';
    return (savedRoute as PageRoute) || 'dashboard';
  });

  const [user, setUser] = useState<UserSubscription>(() => {
    const saved = localStorage.getItem('bs_user');
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });

  const [summary, setSummary] = useState<AudienceSummary>(() => {
    const saved = localStorage.getItem('bs_summary');
    return saved ? JSON.parse(saved) : INITIAL_SUMMARY;
  });

  const [history, setHistory] = useState<CleanupRun[]>(() => {
    const saved = localStorage.getItem('bs_history');
    return saved ? JSON.parse(saved) : INITIAL_HISTORY;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('bs_token');
  });

  // Simulator static configuration
  const [networkLogs, setNetworkLogs] = useState<{ id: string; time: string; text: string; error?: boolean }[]>([
    { id: '1', time: '10:01:04', text: 'ChimpSweep engine initialized.' }
  ]);

  // App UI states
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [openedFaq, setOpenedFaq] = useState<number | null>(null);
  const [confirmUndoRunId, setConfirmUndoRunId] = useState<string | null>(null);
  const [checkoutSelectedPlan, setCheckoutSelectedPlan] = useState<'basic' | 'pro'>('pro');
  const [showDisconnectModal, setShowDisconnectModal] = useState<boolean>(false);
  const [tabsCollapsed, setTabsCollapsed] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('bs_route', route);
  }, [route]);

  useEffect(() => {
    localStorage.setItem('bs_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('bs_summary', JSON.stringify(summary));
  }, [summary]);

  useEffect(() => {
    localStorage.setItem('bs_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('bs_token', token);
    } else {
      localStorage.removeItem('bs_token');
    }
  }, [token]);

  // ─── CRITICAL #1 & #2: Auth Success Handler ───────────────────────────────
  // When the real Mailchimp OAuth flow completes, the backend redirects to:
  //   /auth/success?token=<user_id>&redirect=/pricing  (or /dashboard)
  // This effect fires on mount, reads those URL params, saves the token,
  // cleans the URL, then navigates the user to the correct next step.
  useEffect(() => {
    if (route === 'auth_success') {
      const params = new URLSearchParams(window.location.search);
      const incomingToken = params.get('token');
      const redirectTo = (params.get('redirect') || '/pricing').replace(/^\//, '') as PageRoute;
      if (incomingToken) {
        setToken(incomingToken);
        localStorage.setItem('bs_token', incomingToken);
        // Clean the token out of the address bar immediately
        window.history.replaceState({}, '', '/auth/success');
        setRoute(redirectTo);
      } else {
        setRoute('auth_error');
      }
    }
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push custom service log
  const pushLog = (text: string, error?: boolean) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setNetworkLogs((prev) => [
      { id: Date.now().toString(), time: timeStr, text, error },
      ...prev.slice(0, 49)
    ]);
  };

  // Check valid session on change/load except for safe public routes
  useEffect(() => {
    const publicRoutes: PageRoute[] = [
      'landing',
      'oauth_mailchimp',
      'auth_success',
      'auth_error',
      'privacy',
      'terms'
    ];
    if (!publicRoutes.includes(route)) {
      if (!token) {
        pushLog('Session Check failed. Missing bs_token. Redirecting to Landing Page.', true);
        setRoute('landing');
      } else {
        pushLog(`Session Check active: GET /api/auth/me -> Authorized user [${user.email}] on plan [${user.plan}]`);
      }
    }
  }, [route, token]);

  // Custom Navigation function simulating routing with loading effects or console updates
  const navigateTo = (tgt: PageRoute) => {
    pushLog(`Client-side route navigated to: /${tgt}`);
    setRoute(tgt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── API LAYER ────────────────────────────────────────────────────────────
  // All requests go through here. Token is read from state (already in localStorage).
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const apiFetch = async (method: string, path: string, body?: object) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  // ─── ACTIONS ──────────────────────────────────────────────────────────────

  // Redirects browser to backend which redirects to Mailchimp OAuth
  const handleMailchimpLoginStart = () => {
    pushLog('GET /api/auth/mailchimp -> Redirecting to Mailchimp OAuth');
    window.location.href = `${API_BASE}/api/auth/mailchimp`;
  };

  // Loads user info from /api/auth/me and sets app state
  const loadUserFromApi = async () => {
    try {
      const data = await apiFetch('GET', '/api/auth/me');
      setUser({
        email: data.user.email,
        plan: data.user.plan === 'free' ? 'none' : data.user.plan,
        status: data.user.subscription_status === 'active' ? 'Active'
               : data.user.subscription_status === 'past_due' ? 'Past Due'
               : 'Canceled',
        renewalDate: data.user.subscription_current_period_end
          ? new Date(data.user.subscription_current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : '—',
        mailchimpConnected: true,
      });
      return data.workflow;
    } catch {
      setToken(null);
      setRoute('landing');
      return null;
    }
  };

  // Called on dashboard mount to load summary from Mailchimp live
  const handleRefreshStats = async () => {
    setLoading(true);
    setLoadingText('Scanning your Mailchimp audience... this takes a few seconds.');
    try {
      const data = await apiFetch('GET', '/api/dashboard/summary');
      setSummary({
        unsubscribed_count: data.summary.unsubscribed_count,
        bounced_count: data.summary.bounced_count,
        duplicate_count: data.summary.duplicate_count,
        estimated_savings_cents: data.summary.estimated_savings_cents,
        health_score: data.summary.health_score,
      });
      pushLog('GET /api/dashboard/summary -> Audience snapshot refreshed.');
    } catch (err: any) {
      pushLog(`Summary fetch failed: ${err.message}`, true);
      setSuccessBanner('Failed to load summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load cleanup history from API
  const loadHistory = async () => {
    try {
      const data = await apiFetch('GET', '/api/dashboard/history');
      setHistory(data.runs.map((r: any) => ({
        id: r.id,
        date: new Date(r.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
        timestamp: new Date(r.started_at).getTime(),
        type: r.triggered_by === 'cron' ? 'Auto (weekly)' : 'Manual',
        count: r.total_archived,
        savingsCents: r.estimated_savings_cents,
        status: r.status === 'completed' ? 'Completed' : 'Failed',
      })));
    } catch (err: any) {
      pushLog(`History fetch failed: ${err.message}`, true);
    }
  };

  // Called on dashboard load — fetch user, summary, and history
  useEffect(() => {
    if (route === 'dashboard' && token) {
      loadUserFromApi();
      handleRefreshStats();
      loadHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  // One-click cleanup
  const handleCleanupAction = async () => {
    const totalWasted = summary.unsubscribed_count + summary.bounced_count + summary.duplicate_count;
    if (totalWasted === 0) return;
    setLoading(true);
    setLoadingText('Archiving contacts... this may take a minute.');
    try {
      const data = await apiFetch('POST', '/api/dashboard/cleanup');
      setSuccessBanner(
        `Done! Archived ${data.total_archived} contacts. Your next Mailchimp bill will be approximately $${(data.estimated_savings_cents / 100).toFixed(2)} lower.`
      );
      pushLog(`POST /api/dashboard/cleanup -> Archived ${data.total_archived} contacts.`);
      await handleRefreshStats();
      await loadHistory();
    } catch (err: any) {
      setSuccessBanner('Cleanup failed. Please try again.');
      pushLog(`Cleanup failed: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  // Select plan → call backend → redirect to Stripe checkout
  const handleSelectPlan = async (plan: 'basic' | 'pro') => {
    setCheckoutSelectedPlan(plan);
    setLoading(true);
    setLoadingText('Redirecting to checkout...');
    try {
      const data = await apiFetch('POST', '/api/billing/checkout', { plan });
      pushLog(`POST /api/billing/checkout -> Stripe session created for [${plan}]`);
      window.location.href = data.checkout_url;
    } catch (err: any) {
      setLoading(false);
      setSuccessBanner('Could not start checkout. Please try again.');
      pushLog(`Checkout failed: ${err.message}`, true);
    }
  };

  // Open Stripe billing portal
  const handleOpenBillingPortal = async () => {
    setLoading(true);
    setLoadingText('Opening billing portal...');
    try {
      const data = await apiFetch('POST', '/api/billing/portal');
      window.location.href = data.portal_url;
    } catch (err: any) {
      setLoading(false);
      setSuccessBanner('Could not open billing portal. Please try again.');
    }
  };

  // Undo a cleanup run (Pro only)
  const handleUndoRun = async (runId: string) => {
    if (user.plan !== 'pro') return;
    setLoading(true);
    setLoadingText('Restoring contacts...');
    try {
      const data = await apiFetch('POST', `/api/dashboard/undo/${runId}`);
      setSuccessBanner(`Restored ${data.restored} contacts back to their original status.`);
      setConfirmUndoRunId(null);
      pushLog(`POST /api/dashboard/undo/${runId} -> Restored ${data.restored} contacts.`);
      await handleRefreshStats();
      await loadHistory();
    } catch (err: any) {
      setSuccessBanner('Undo failed. Please try again.');
      pushLog(`Undo failed: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try { await apiFetch('POST', '/api/auth/logout'); } catch { /* stateless — fine to ignore */ }
    setUser(INITIAL_USER);
    setToken(null);
    setSummary(INITIAL_SUMMARY);
    setHistory(INITIAL_HISTORY);
    setShowDisconnectModal(false);
    localStorage.removeItem('bs_token');
    localStorage.removeItem('bs_route');
    pushLog('Logged out. Session cleared.');
    setRoute('landing');
  };

  // These are kept as no-ops since the simulator OAuth screen is removed in production
  // (the real flow goes directly to Mailchimp via window.location.href)
  const handleAuthorizeOAuth = () => navigateTo('pricing');
  const handleDenyOAuth = () => navigateTo('auth_error');
  const handleCheckoutComplete = () => navigateTo('dashboard');
  const handleCheckoutCancel = () => navigateTo('pricing');

  // Helper values
  const totalWasteContacts = summary.unsubscribed_count + summary.bounced_count + summary.duplicate_count;

  return (
    <div className="min-h-screen bg-white flex flex-col antialiased selection:bg-midnight-ink/10 selection:text-midnight-ink relative grid-accent overflow-x-hidden">
      <div className="gradient-bg"></div>
      




      {/* 3. API GLOBAL BLOCKING SPINNER */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#111111]/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-white px-4"
          >
            <div className="max-w-md w-full bg-[#18181b] border border-[#ffe01b]/20 p-8 rounded-xl flex flex-col items-center">
              <RefreshCw className="w-10 h-10 text-[#ffe01b] animate-spin mb-4" />
              <p className="text-sm font-mono text-[#ffe01b] mb-2 uppercase tracking-widest text-center">Engine Sync Query</p>
              <h3 className="text-base font-medium text-[#f4f3ef] text-center antialiased font-semibold">{loadingText}</h3>
              <div className="mt-6 w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                  className="bg-gradient-to-r from-[#ffe01b] to-white h-full"
                ></motion.div>
              </div>
              <p className="text-[11px] text-zinc-500 mt-3 font-mono">Synchronizing real-time endpoints...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. NOTIFICATION BANNER CARRIER */}
      <AnimatePresence>
        {successBanner && (
          <div className="fixed bottom-6 right-6 z-50 max-w-md bg-zinc-900 border border-zinc-800 text-[#f4f3ef] p-4 rounded-xl shadow-2xl flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white">Action Completed</h4>
              <p className="text-xs text-zinc-300 mt-1">{successBanner}</p>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-zinc-500 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* 5. APP VIEWPORT RENDERER */}
      <div className="flex-1 flex flex-col bg-white">
        
        {/* =========================================================================
            A. LANDING PAGE VIEW
            ========================================================================= */}
        {route === 'landing' && (
          <div className="flex-1 flex flex-col bg-white">
            
            {/* Header */}
            <header className="sticky top-0 bg-white border-b border-[#11111108] h-16 flex items-center justify-between px-6 md:px-10 z-10">
              <div onClick={() => navigateTo('landing')} className="flex items-center gap-2 cursor-pointer select-none">
                <span className="font-extrabold tracking-tighter text-xl text-midnight-ink font-sans">
                  Chimp<span className="text-[#d8be14]">Sweep</span>
                </span>
              </div>
              <nav className="hidden md:flex gap-6">
                <a href="#how-it-works" className="text-sm font-medium text-muted-ash hover:text-midnight-ink transition-all">How It Works</a>
                <a href="#savings-demo" className="text-sm font-medium text-muted-ash hover:text-midnight-ink transition-all">Case Study</a>
                <a href="#pricing-preview" className="text-sm font-medium text-muted-ash hover:text-midnight-ink transition-all">Pricing</a>
                <a href="#faq" className="text-sm font-medium text-muted-ash hover:text-midnight-ink transition-all font-sans">FAQ</a>
              </nav>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleMailchimpLoginStart}
                  className="text-sm font-bold text-midnight-ink hover:text-muted-ash transition-all cursor-pointer"
                >
                  Login
                </button>
                <button
                  onClick={handleMailchimpLoginStart}
                  className="bg-[#ffe01b] text-midnight-ink border border-[#241c15]/15 rounded-lg px-6 py-2 text-sm font-bold hover:bg-[#ebd018] hover:shadow-sm transition-all cursor-pointer"
                >
                  Start for free
                </button>
              </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-16 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[100px] bg-gradient-to-b from-[#ffe01b]/10 to-transparent -z-10"></div>

              <div className="max-w-3xl flex flex-col items-center">
                <div className="bg-[#ffe01b] text-midnight-ink text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-6 border border-[#241c15]/10">
                  Mailchimp Optimization Standard
                </div>
                
                <h1 className="text-4xl md:text-[56px] font-black text-midnight-ink leading-tight md:leading-[1.05] tracking-[-2px] mb-6 max-w-3xl">
                  You're paying Mailchimp for contacts who will <span className="underline decoration-[#ffe01b] decoration-[6px] underline-offset-4">never</span> read your emails.
                </h1>
                
                <p className="text-sm md:text-lg text-muted-ash leading-relaxed max-w-2xl mb-10">
                  Unsubscribed contacts. Bounced addresses. Duplicates. Mailchimp charges you for all of them — every single month. ChimpSweep finds them and sweeps them in one click, so your next bill is lower.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
                  <button
                    onClick={handleMailchimpLoginStart}
                    className="w-full bg-[#ffe01b] text-midnight-ink hover:bg-[#ebd018] font-extrabold text-sm py-4 px-8 rounded-lg border border-[#241c15]/15 transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer group"
                  >
                    <span>Connect Mailchimp</span>
                    <ArrowRight className="w-4 h-4 text-midnight-ink group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                
                <p className="text-xs text-muted-ash mt-4 font-sans select-none">
                  No credit card required to connect. See your savings in 60 seconds.
                </p>
              </div>

              {/* Live Preview Container Dashboard Widget */}
              <div className="mt-14 w-full max-w-4xl bg-white border border-[#11111108] rounded-xl shadow-subtle p-6 text-left relative">
                <div className="flex items-center justify-between border-b border-[#11111108] pb-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#111111]/10"></div>
                    <span className="text-xs font-mono font-medium text-muted-ash">Live Billing Audit Simulation</span>
                  </div>
                  <span className="text-[10px] bg-[#272625] text-white px-2.5 py-1 rounded-md uppercase tracking-wider font-semibold">Typical Result</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-whisper-gray rounded-xl">
                    <p className="text-xs text-muted-ash uppercase font-semibold">Unsubscribed</p>
                    <p className="text-2xl font-black mt-1 text-midnight-ink">1,200</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Inactive, yet still billed</p>
                  </div>
                  <div className="p-4 bg-whisper-gray rounded-xl">
                    <p className="text-xs text-muted-ash uppercase font-semibold">Bounced</p>
                    <p className="text-2xl font-black mt-1 text-midnight-ink">400</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Permanently invalid</p>
                  </div>
                  <div className="p-4 bg-whisper-gray rounded-xl">
                    <p className="text-xs text-muted-ash uppercase font-semibold">Duplicates</p>
                    <p className="text-2xl font-black mt-1 text-midnight-ink">200</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Identical redundancies</p>
                  </div>
                  <div className="p-4 bg-midnight-ink text-white rounded-xl shadow-sm">
                    <p className="text-xs text-zinc-400 uppercase font-semibold">Estimated Savings</p>
                    <p className="text-2xl font-black text-white mt-1">$30.00</p>
                    <p className="text-[10px] text-zinc-400 mt-1 font-semibold">Saved on your next bill</p>
                  </div>
                </div>

                <div className="mt-4 bg-whisper-gray border border-[#11111108] rounded-xl p-4 text-xs text-midnight-ink flex items-center space-x-2">
                  <Info className="w-4 h-4 text-midnight-ink flex-shrink-0" />
                  <span>
                    <strong>Rule:</strong> Mailchimp bills you for <strong>all</strong> contacts in your audience pool regardless of selection or subscription status. Cleanup removes the waste.
                  </span>
                </div>
              </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="bg-whisper-gray py-24 px-6 md:px-12 border-y border-[#11111108]">
              <div className="max-w-7xl mx-auto">
                <div className="text-center max-w-xl mx-auto mb-16">
                  <h2 className="text-3xl font-extrabold text-midnight-ink tracking-tight mb-3">How it cleans up your bill</h2>
                  <p className="text-sm text-muted-ash leading-relaxed">Three simple milestones to permanently drive down your email distribution overhead costs.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-xl border border-[#11111108] shadow-subtle flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-full bg-midnight-ink text-white flex items-center justify-center font-bold text-xs mb-6 font-mono">1</div>
                      <h3 className="text-lg font-bold text-midnight-ink mb-2">Connect Your Mailchimp Account</h3>
                      <p className="text-sm text-muted-ash leading-relaxed">
                        Click one button. We use Mailchimp's official OAuth so your password is never stored.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-xl border border-[#11111108] shadow-subtle flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-full bg-midnight-ink text-white flex items-center justify-center font-bold text-xs mb-6 font-mono">2</div>
                      <h3 className="text-lg font-bold text-midnight-ink mb-2">See Exactly What You're Wasting</h3>
                      <p className="text-sm text-muted-ash leading-relaxed">
                        We scan your audience and show you how many unsubscribed, bounced, and duplicate contacts Mailchimp is billing you for — and exactly how much that costs you every month.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-xl border border-[#11111108] shadow-subtle flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-full bg-midnight-ink text-[#fff] flex items-center justify-center font-bold text-xs mb-6 font-mono">3</div>
                      <h3 className="text-lg font-bold text-midnight-ink mb-2">Archive Them in One Click</h3>
                      <p className="text-sm text-muted-ash leading-relaxed">
                        Hit the cleanup button. We archive every wasteful contact instantly. Your next Mailchimp bill will be lower. It's that simple.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Savings Example Section */}
            <section id="savings-demo" className="py-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-extrabold text-midnight-ink tracking-tight mb-4">See what a real cleanup looks like</h2>
                  <p className="text-sm text-muted-ash leading-relaxed mb-6">
                    Rather than manually deleting contacts one-by-one or missing hidden double-billing duplicates, our algorithm extracts the bulk waste. Archive this month, enjoy physical reduction starting next month.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-xs text-midnight-ink">
                      <Check className="w-4 h-4 text-emerald-505 bg-emerald-500/10 p-0.5 rounded-full" />
                      <span>Complies with Mailchimp's Terms of Service</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-midnight-ink">
                      <Check className="w-4 h-4 text-emerald-505 bg-emerald-500/10 p-0.5 rounded-full" />
                      <span>Contacts can be restored seamlessly anytime</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-midnight-ink">
                      <Check className="w-4 h-4 text-emerald-505 bg-emerald-500/10 p-0.5 rounded-full" />
                      <span>Instant visual dashboard generation</span>
                    </div>
                  </div>
                </div>
                <InteractiveSavingsCalculator />
              </div>
            </section>

            {/* Pricing Preview Section */}
            <section id="pricing-preview" className="bg-whisper-gray/40 py-24 px-6 md:px-12 border-y border-[#11111108]">
              <div className="max-w-7xl mx-auto w-full text-center">
                <div className="max-w-xl mx-auto mb-14">
                  <h2 className="text-3xl font-extrabold text-midnight-ink tracking-tight mb-3">Simple, transparent pricing</h2>
                  <p className="text-sm text-muted-ash">Pick the plan that works for you. Safe secure mock integration checkout process.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto text-left">
                  {/* Basic Plan Preview */}
                  <div className="bg-white p-8 rounded-xl border border-[#11111108] shadow-subtle relative flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Basic</h3>
                      <p className="text-3xl font-black text-midnight-ink mb-1">$10 <span className="text-xs font-normal text-muted-ash">/ month</span></p>
                      <p className="text-xs text-muted-ash mb-6">Manual cleanup whenever you want.</p>
                      
                      <div className="h-px bg-[#11111108] w-full mb-6"></div>
                      
                      <ul className="space-y-3 mb-8 text-[13px] text-muted-ash">
                        <li className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                          <span>One-click manual cleanup operations</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                          <span>Detailed waste index counts and reports</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                          <span>Live estimated billing savings reports</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={handleMailchimpLoginStart}
                      className="w-full bg-white border border-[#241c15]/30 hover:bg-whisper-gray text-midnight-ink font-bold text-sm py-3.5 rounded-lg text-center transition cursor-pointer shadow-sm"
                    >
                      Get Started with Basic
                    </button>
                  </div>

                  {/* Pro Plan Preview */}
                  <div className="bg-white p-8 rounded-xl border-2 border-midnight-ink shadow-subtle relative flex flex-col justify-between animate-pulse-subtle">
                    <span className="absolute -top-3.5 right-6 bg-midnight-ink text-white px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider">Most Popular</span>
                    <div>
                      <h3 className="text-xl font-bold mb-1">Pro</h3>
                      <p className="text-3xl font-black text-midnight-ink mb-1">$25 <span className="text-xs font-normal text-muted-ash">/ month</span></p>
                      <p className="text-xs text-muted-ash mb-6">Automatic weekly cleanup. Set it and forget it.</p>
                      
                      <div className="h-px bg-[#11111108] w-full mb-6"></div>
                      
                      <ul className="space-y-3 mb-8 text-[13px] text-muted-ash">
                        <li className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                          <span className="font-semibold text-midnight-ink">Everything in Basic included</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                          <span>Automatic weekly background clean runs</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                          <span>30-day index rollback & undo functionality</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                          <span>Detailed logs with full cleanup diagnostics</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={handleMailchimpLoginStart}
                      className="w-full bg-[#ffe01b] hover:bg-[#ebd018] text-midnight-ink border border-[#241c15]/15 font-extrabold text-sm py-3.5 rounded-lg text-center transition cursor-pointer shadow-sm"
                    >
                      Get Started with Pro
                    </button>
                  </div>
                </div>

                <p className="text-xs text-muted-ash mt-8">
                  You'll choose your plan after connecting Mailchimp. No charge until you pick a plan.
                </p>
              </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24 px-6 md:px-12 max-w-3xl mx-auto w-full">
              <h2 className="text-3xl font-extrabold text-midnight-ink tracking-tight mb-8 text-center animate-pulse-subtle">Frequently asked questions</h2>
              
              <div className="space-y-4">
                {[
                  {
                    q: 'Why does Mailchimp charge for unsubscribed contacts?',
                    a: "Mailchimp's pricing is based on your total audience size — not just the contacts who are actively subscribed and receiving emails. Every person who has unsubscribed, every email address that has bounced, and every duplicate entry still counts toward your billing tier. Most Mailchimp users don't realize this until they look closely at their bill."
                  },
                  {
                    q: "Why don't I see savings immediately after cleanup?",
                    a: "Mailchimp calculates your bill based on your contact count at the start of each billing cycle — not in real time. If you archive contacts today, your current month's bill stays the same. But your next bill will be lower because your contact count will be lower at the start of that new cycle. We show this clearly everywhere in the app: archive this month, save next month."
                  },
                  {
                    q: 'Is it safe to archive my contacts?',
                    a: 'Yes. Archiving in Mailchimp is not the same as deleting. Archived contacts are not permanently removed — their data is still held by Mailchimp, they just no longer count toward your billing tier. With ChimpSweep\'s Pro plan, you also get a 30-day window to undo any cleanup and restore all contacts back to their original status with one click.'
                  },
                  {
                    q: 'Does ChimpSweep store my Mailchimp password?',
                    a: 'Never. We use Mailchimp\'s official OAuth 2.0 login, which means you authenticate directly on Mailchimp\'s own website. ChimpSweep only receives a secure access token — the same technology used by thousands of apps that integrate with other services. Your password is never seen or stored by us.'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white border border-[#11111108] rounded-xl overflow-hidden shadow-subtle">
                    <button
                      onClick={() => setOpenedFaq(openedFaq === idx ? null : idx)}
                      className="w-full flex items-center justify-between p-5 text-left font-semibold text-[15px] text-midnight-ink hover:text-midnight-ink/80 transition-all cursor-pointer"
                    >
                      <span>{item.q}</span>
                      <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${openedFaq === idx ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {openedFaq === idx && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-[#11111108]"
                        >
                          <p className="p-5 text-xs md:text-sm text-muted-ash leading-relaxed bg-whisper-gray">
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

            </section>

            {/* Footer */}
            <footer className="bg-[#111111] text-[#ecebea] py-12 px-6 md:px-12 border-t border-[#222222]">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold tracking-tighter text-xl text-white font-sans select-none">
                    Chimp<span className="text-[#ffe01b]">Sweep</span>
                  </span>
                  <span className="text-xs text-muted-ash font-sans select-none border-l border-zinc-800 pl-3">Sweeping your Mailchimp audience clean.</span>
                </div>
                
                <div className="flex items-center space-x-6 text-xs text-zinc-400">
                  <button onClick={() => navigateTo('privacy')} className="hover:text-white transition cursor-pointer">Privacy Policy</button>
                  <button onClick={() => navigateTo('terms')} className="hover:text-white transition cursor-pointer">Terms of Service</button>
                  <a href="mailto:support@chimpsweep.com" className="hover:text-white transition">Contact Support</a>
                </div>

                <div className="text-[11px] text-zinc-500 font-sans">
                  © 2026 ChimpSweep. All rights reserved.
                </div>
              </div>
            </footer>

          </div>
        )}

        {/* =========================================================================
            B. MAILCHIMP OAUTH SCREEN
            ========================================================================= */}
        {route === 'oauth_mailchimp' && (
          <div className="flex-1 bg-[#231f20] text-[#f4f3ef] flex items-center justify-center py-16 px-4">
            <div className="max-w-md w-full bg-[#1e1b1c] rounded-2xl border border-zinc-800 p-8 shadow-2xl relative">
              
              {/* Mailchimp Freddie mascot branding */}
              <div className="flex flex-col items-center text-center mb-8 select-none">
                <div className="w-16 h-16 rounded-full bg-[#FFE01B] flex items-center justify-center shadow-lg transform -rotate-6 border border-[#241c15]/10">
                  {/* Real official Mailchimp Freddie mascot SVG */}
                  <svg viewBox="0 0 448 512" className="w-10 h-10 text-[#241c15]" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M330.61 243.52a36.15 36.15 0 0 1 9.3 0c1.66-3.83 1.95-10.43.45-17.61-2.23-10.67-5.25-17.14-11.48-16.13s-6.47 8.74-4.24 19.42c1.26 6 3.49 11.14 6 14.32zM277.05 252c4.47 2 7.2 3.26 8.28 2.13 1.89-1.94-3.48-9.39-12.12-13.09a31.44 31.44 0 0 0-30.61 3.68c-3 2.18-5.81 5.22-5.41 7.06.85 3.74 10-2.71 22.6-3.48 7-.44 12.8 1.75 17.26 3.71zm-9 5.13c-9.07 1.42-15 6.53-13.47 10.1.9.34 1.17.81 5.21-.81a37 37 0 0 1 18.72-1.95c2.92.34 4.31.52 4.94-.49 1.46-2.22-5.71-8-15.39-6.85zm54.17 17.1c3.38-6.87-10.9-13.93-14.3-7s10.92 13.88 14.32 6.97zm15.66-20.47c-7.66-.13-7.95 15.8-.26 15.93s7.98-15.81.28-15.96zm-218.79 78.9c-1.32.31-6 1.45-8.47-2.35-5.2-8 11.11-20.38 3-35.77-9.1-17.47-27.82-13.54-35.05-5.54-8.71 9.6-8.72 23.54-5 24.08 4.27.57 4.08-6.47 7.38-11.63a12.83 12.83 0 0 1 17.85-3.72c11.59 7.59 1.37 17.76 2.28 28.62 1.39 16.68 18.42 16.37 21.58 9a2.08 2.08 0 0 0-.2-2.33c.03.89.68-1.3-3.35-.39zm299.72-17.07c-3.35-11.73-2.57-9.22-6.78-20.52 2.45-3.67 15.29-24-3.07-43.25-10.4-10.92-33.9-16.54-41.1-18.54-1.5-11.39 4.65-58.7-21.52-83 20.79-21.55 33.76-45.29 33.73-65.65-.06-39.16-48.15-51-107.42-26.47l-12.55 5.33c-.06-.05-22.71-22.27-23.05-22.57C169.5-18-41.77 216.81 25.78 273.85l14.76 12.51a72.49 72.49 0 0 0-4.1 33.5c3.36 33.4 36 60.42 67.53 60.38 57.73 133.06 267.9 133.28 322.29 3 1.74-4.47 9.11-24.61 9.11-42.38s-10.09-25.27-16.53-25.27zm-316 48.16c-22.82-.61-47.46-21.15-49.91-45.51-6.17-61.31 74.26-75.27 84-12.33 4.54 29.64-4.67 58.49-34.12 57.81zM84.3 249.55C69.14 252.5 55.78 261.09 47.6 273c-4.88-4.07-14-12-15.59-15-13.01-24.85 14.24-73 33.3-100.21C112.42 90.56 186.19 39.68 220.36 48.91c5.55 1.57 23.94 22.89 23.94 22.89s-34.15 18.94-65.8 45.35c-42.66 32.85-74.89 80.59-94.2 132.4zM323.18 350.7s-35.74 5.3-69.51-7.07c6.21-20.16 27 6.1 96.4-13.81 15.29-4.38 35.37-13 51-25.35a102.85 102.85 0 0 1 7.12 24.28c3.66-.66 14.25-.52 11.44 18.1-3.29 19.87-11.73 36-25.93 50.84A106.86 106.86 0 0 1 362.55 421a132.45 132.45 0 0 1-20.34 8.58c-53.51 17.48-108.3-1.74-126-43a66.33 66.33 0 0 1-3.55-9.74c-7.53-27.2-1.14-59.83 18.84-80.37 1.23-1.31 2.48-2.85 2.48-4.79a8.45 8.45 0 0 0-1.92-4.54c-7-10.13-31.19-27.4-26.33-60.83 3.5-24 24.49-40.91 44.07-39.91l5 .29c8.48.5 15.89 1.59 22.88 1.88 11.69.5 22.2-1.19 34.64-11.56 4.2-3.5 7.57-6.54 13.26-7.51a17.45 17.45 0 0 1 13.6 2.24c10 6.64 11.4 22.73 11.92 34.49.29 6.72 1.1 23 1.38 27.63.63 10.67 3.43 12.17 9.11 14 3.19 1.05 6.15 1.83 10.51 3.06 13.21 3.71 21 7.48 26 12.31a16.38 16.38 0 0 1 4.74 9.29c1.56 11.37-8.82 25.4-36.31 38.16-46.71 21.68-93.68 14.45-100.48 13.68-20.15-2.71-31.63 23.32-19.55 41.15 22.64 33.41 122.4 20 151.37-21.35.69-1 .12-1.59-.73-1-41.77 28.58-97.06 38.21-128.46 26-4.77-1.85-14.73-6.44-15.94-16.67 43.6 13.49 71 .74 71 .74s2.03-2.79-.56-2.53zm-68.47-5.7zm-83.4-187.5c16.74-19.35 37.36-36.18 55.83-45.63a.73.73 0 0 1 1 1c-1.46 2.66-4.29 8.34-5.19 12.65a.75.75 0 0 0 1.16.79c11.49-7.83 31.48-16.22 49-17.3a.77.77 0 0 1 .52 1.38 41.86 41.86 0 0 0-7.71 7.74.75.75 0 0 0 .59 1.19c12.31.09 29.66 4.4 41 10.74.76.43.22 1.91-.64 1.72-69.55-15.94-123.08 18.53-134.5 26.83a.76.76 0 0 1-1-1.12z" />
                  </svg>
                </div>
                <h2 className="text-[#FFE01B] font-black text-xl tracking-tight mt-3">mailchimp</h2>
                <div className="h-px bg-zinc-800 w-full mt-4"></div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold text-zinc-200">
                  Authorize <span className="text-white underline font-bold">ChimpSweep App</span> to access your account:
                </p>
                
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs space-y-3 font-sans">
                  <div className="flex items-start space-x-2 text-zinc-300">
                    <Check className="w-4 h-4 text-[#FFE01B] flex-shrink-0 mt-0.5" />
                    <span>Read access to lists, segments, and total counts (Required to analyze bounced indices)</span>
                  </div>
                  <div className="flex items-start space-x-2 text-zinc-300">
                    <Check className="w-4 h-4 text-[#FFE01B] flex-shrink-0 mt-0.5" />
                    <span>Permission to trigger archiving and segment modifications (Required to offload billing tier targets)</span>
                  </div>
                  <div className="flex items-start space-x-2 text-zinc-300">
                    <Check className="w-4 h-4 text-[#FFE01B] flex-shrink-0 mt-0.5" />
                    <span>Read connected profile metrics and logs</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400 rounded">
                  Logged in as: <strong className="text-zinc-200">{user.email}</strong>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={handleDenyOAuth}
                    className="py-3 bg-zinc-800 hover:bg-zinc-700/80 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Cancel / Deny
                  </button>
                  <button
                    onClick={handleAuthorizeOAuth}
                    className="py-3 bg-[#FFE01B] hover:bg-[#FFE01B]/90 text-[#231f20] rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer"
                  >
                    Allow Access
                  </button>
                </div>

                <p className="text-[10px] text-zinc-500 text-center font-sans">
                  OAuth authorization establishes a secure restricted session token. Password is never shared.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* =========================================================================
            C. AUTH SUCCESS PAGE
            Mailchimp redirects here: /auth/success?token=xxx&redirect=/pricing
            The useEffect on mount handles token extraction and redirect.
            This screen shows for the moment before that redirect fires.
            ========================================================================= */}
        {route === 'auth_success' && (
          <div className="flex-1 bg-white flex flex-col items-center justify-center p-12">
            <div className="flex flex-col items-center space-y-4">
              <RefreshCw className="w-8 h-8 text-[#ffe01b] animate-spin" />
              <p className="text-sm font-semibold text-midnight-ink">Setting up your account...</p>
              <p className="text-xs text-muted-ash">You'll be redirected in a moment.</p>
            </div>
          </div>
        )}



        {/* =========================================================================
            D. AUTH ERROR PAGE
            ========================================================================= */}
        {route === 'auth_error' && (
          <div className="flex-1 bg-white flex flex-col items-center justify-center p-12">
            <div className="max-w-md w-full bg-whisper-gray/40 border border-[#11111108] rounded-2xl p-8 text-center shadow-subtle">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 border border-rose-200/50 rounded-full" />
              </div>
              
              <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
              
              <p className="text-xs md:text-sm text-muted-ash leading-relaxed mb-6">
                We weren't able to connect your Mailchimp account. This can happen if you denied access or if there was a temporary issue.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleMailchimpLoginStart}
                  className="w-full bg-midnight-ink hover:opacity-90 text-white text-xs font-bold py-3.5 rounded-lg tracking-widest uppercase transition cursor-pointer shadow-sm"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigateTo('landing')}
                  className="w-full bg-white hover:bg-whisper-gray text-midnight-ink text-xs font-bold py-3.5 rounded-lg tracking-widest uppercase border border-[#11111108] transition cursor-pointer shadow-sm"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            E. PRICING PAGE
            ========================================================================= */}
        {route === 'pricing' && (
          <div className="flex-1 bg-white py-16 px-6">
            <div className="max-w-4xl mx-auto w-full">
              
              <div className="text-center max-w-xl mx-auto mb-12">
                <div className="inline-flex items-center space-x-1.5 bg-whisper-gray text-midnight-ink border border-[#11111108] px-3 py-1 rounded-full text-[10px] uppercase font-bold mb-3">
                  <Check className="w-3.5 h-3.5 bg-[#b7efb2] text-black p-0.5 rounded-full" />
                  <span>Mailchimp Connected Successfully</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#111111] tracking-tight mb-2">Choose your plan</h1>
                <p className="text-xs md:text-sm text-muted-ash">
                  You're connected. Now pick the plan that fits you and start saving on your next Mailchimp bill.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                {/* Basic Card */}
                <div className="bg-white p-6 rounded-xl border border-[#11111108] shadow-subtle flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-muted-ash font-semibold block uppercase">For individuals</span>
                    <h3 className="text-lg font-bold text-[#111111] mt-1">Basic</h3>
                    <p className="text-2xl font-black text-midnight-ink mt-2">$10 <span className="text-xs font-normal text-muted-ash">/ month</span></p>
                    
                    <div className="h-px bg-[#11111108] my-4"></div>
                    
                    <ul className="space-y-2 text-[12px] text-[#6d6c6b] mb-6">
                      <li className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                        <span>One-click manual cleanup</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                        <span>Waste summary metrics diagnostics</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                        <span>Estimated savings index logs</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                        <span>List health score indicator (0-100)</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleSelectPlan('basic')}
                    className="w-full bg-midnight-ink hover:opacity-90 text-white font-bold text-xs py-3.5 rounded-lg tracking-widest uppercase transition cursor-pointer shadow-sm"
                  >
                    Start with Basic
                  </button>
                </div>

                {/* Pro Card */}
                <div className="bg-white p-6 rounded-xl border-2 border-[#111111] shadow-subtle relative flex flex-col justify-between">
                  <div className="absolute -top-3.5 right-6 bg-midnight-ink text-white font-bold text-[9px] uppercase px-2.5 py-1 rounded-full border border-midnight-ink">Most Popular</div>
                  
                  <div>
                    <span className="text-xs text-midnight-ink font-bold block uppercase tracking-wider">Best value</span>
                    <h3 className="text-lg font-bold text-midnight-ink mt-1">Pro</h3>
                    <p className="text-2xl font-black text-midnight-ink mt-2">$25 <span className="text-xs font-normal text-muted-ash">/ month</span></p>
                    
                    <div className="h-px bg-[#11111108] my-4"></div>
                    
                    <ul className="space-y-2 text-[12px] text-[#6d6c6b] mb-6">
                      <li className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                        <span className="font-semibold text-midnight-ink">Everything in Basic included</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                        <span>Automatic cleanup every Monday — no action needed</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                        <span>30-day undo — restore any archived contacts within 30 days</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full flex-shrink-0" />
                        <span>Full cleanup history log metadata</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleSelectPlan('pro')}
                    className="w-full bg-midnight-ink hover:opacity-90 text-white font-bold text-xs py-3.5 rounded-lg tracking-widest uppercase transition cursor-pointer shadow-sm"
                  >
                    Start with Pro
                  </button>
                </div>
              </div>

              <div className="mt-12 text-center max-w-md mx-auto space-y-2 text-[11px] text-[#6d6c6b] font-sans">
                <p>
                  <strong>Rule Check:</strong> Archive this month → save next month. Savings apply to your next Mailchimp billing cycle, not the current one.
                </p>
                <p>Cancel subscription anytime. No contracts. No cancellation fees.</p>
              </div>

            </div>
          </div>
        )}

        {/* =========================================================================
            F. STRIPE SECURE CHECKOUT PAGE
            ========================================================================= */}
        {route === 'checkout' && (
          <div className="flex-1 bg-[#fafafa] flex items-center justify-center p-6 py-20">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-subtle border border-[#1111110a] p-8 font-sans">
              
              <div className="flex items-center space-x-2 text-midnight-ink mb-6 font-semibold text-xs tracking-wider uppercase">
                <span className="bg-midnight-ink text-white w-5 h-5 rounded flex items-center justify-center font-bold text-[10px]">S</span>
                <span>Stripe Secure Connection</span>
              </div>
              
              <span className="text-[10px] text-muted-ash font-bold tracking-wider uppercase block">Your Selected Plan</span>
              <h3 className="text-3xl font-black text-midnight-ink tracking-tight capitalize mt-0.5">{checkoutSelectedPlan} Plan</h3>
              
              <div className="flex items-baseline space-x-1.5 mt-2 mb-6">
                <span className="text-4xl font-black text-midnight-ink">${checkoutSelectedPlan === 'pro' ? '25.00' : '10.00'}</span>
                <span className="text-muted-ash text-xs">USD / month</span>
              </div>

              <div className="h-px bg-[#11111108] mb-6"></div>

              <span className="text-[10px] text-muted-ash font-bold tracking-wider uppercase block mb-3.5">Features Included with this Plan:</span>
              <ul className="space-y-4 text-xs text-muted-ash mb-8">
                {checkoutSelectedPlan === 'pro' ? (
                  <>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4.5 h-4.5 text-emerald-500 bg-emerald-50 p-0.5 rounded-full flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-midnight-ink block">Everything in Basic</span>
                        <span className="text-[11px] text-muted-ash">Full manual scan and core indicators</span>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4.5 h-4.5 text-emerald-500 bg-emerald-50 p-0.5 rounded-full flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-midnight-ink block">Automatic Weekly Runs</span>
                        <span className="text-[11px] text-muted-ash">Background sweep cleans stale entries weekly</span>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4.5 h-4.5 text-emerald-500 bg-emerald-50 p-0.5 rounded-full flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-midnight-ink block">30-Day Index Rollback & Undo</span>
                        <span className="text-[11px] text-muted-ash">Accidentally archived? Restore with one click</span>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4.5 h-4.5 text-emerald-500 bg-emerald-50 p-0.5 rounded-full flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-midnight-ink block">Detailed Diagnostic Logs</span>
                        <span className="text-[11px] text-muted-ash">Full audits of all cleaned contacts and why</span>
                      </div>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4.5 h-4.5 text-emerald-500 bg-emerald-50 p-0.5 rounded-full flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-midnight-ink block">One-Click Manual Cleanups</span>
                        <span className="text-[11px] text-muted-ash">Instantly target invalid and waste contacts</span>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4.5 h-4.5 text-emerald-500 bg-emerald-50 p-0.5 rounded-full flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-midnight-ink block">Detailed Waste Index Counts</span>
                        <span className="text-[11px] text-muted-ash">Full breakout reports of billing leakage</span>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4.5 h-4.5 text-emerald-500 bg-emerald-50 p-0.5 rounded-full flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-midnight-ink block">Live Savings Estimators</span>
                        <span className="text-[11px] text-muted-ash">Calculate financial wins as contacts drop</span>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4.5 h-4.5 text-emerald-500 bg-emerald-50 p-0.5 rounded-full flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-midnight-ink block">List Health Score (0-100)</span>
                        <span className="text-[11px] text-muted-ash">A real-time gauge of audience optimization</span>
                      </div>
                    </li>
                  </>
                )}
              </ul>

              <div className="space-y-3">
                <button
                  onClick={handleCheckoutComplete}
                  className="w-full py-4 px-4 bg-[#111111] hover:opacity-90 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer shadow-sm uppercase tracking-wider"
                >
                  <ShieldCheck className="w-4.5 h-4.5 mr-1 text-[#47d096] bg-emerald-500/10 p-0.5 rounded-full" />
                  <span>Proceed to Stripe Secure Checkout</span>
                </button>
                <button
                  onClick={handleCheckoutCancel}
                  className="w-full py-3.5 px-4 border border-[#1111110d] text-muted-ash rounded-xl hover:bg-whisper-gray text-xs font-bold transition cursor-pointer text-center block uppercase tracking-wider"
                >
                  Cancel and Go Back
                </button>
              </div>

            </div>
          </div>
        )}

        {/* =========================================================================
            G. STRIPE CUSTOMER BILLING PORTAL (Goes outside App structure)
            ========================================================================= */}
        {route === 'stripe_portal' && (
          <div className="flex-1 bg-whisper-gray text-midnight-ink flex items-center justify-center p-4 py-16 font-sans">
            <div className="max-w-lg w-full bg-white rounded-2xl border border-[#11111108] p-8 shadow-2xl">
              
              <div className="flex items-center justify-between pb-6 border-b border-light-edge mb-6">
                <div>
                  <h3 className="text-lg font-bold text-midnight-ink flex items-center">
                    <CreditCard className="w-5 h-5 text-midnight-ink mr-2" />
                    Stripe Customer Portal
                  </h3>
                  <p className="text-muted-ash text-xs mt-0.5">Billing management console for {user.email}</p>
                </div>
                <span className="text-[10px] font-mono border border-light-edge bg-whisper-gray rounded px-2 py-1 text-muted-ash">MOCK</span>
              </div>

              {/* Active Plan details & toggle */}
              <div className="bg-whisper-gray p-5 rounded-xl border border-light-edge space-y-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] tracking-wider font-bold text-muted-ash uppercase">Current active plan</span>
                    <h4 className="text-base font-bold text-midnight-ink uppercase mt-0.5">{user.plan} Subscription</h4>
                    <p className="text-xs text-muted-ash mt-1">Status: <span className="text-emerald-600 font-bold">{user.status}</span></p>
                  </div>
                  <strong className="text-lg font-black text-midnight-ink">${user.plan === 'pro' ? '25.00' : user.plan === 'basic' ? '10.00' : '0.00'}/mo</strong>
                </div>

                <div className="h-px bg-light-edge w-full"></div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-midnight-ink block">Available Modifications:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {user.plan === 'basic' && (
                      <button
                        onClick={() => {
                          setUser((prev) => ({ ...prev, plan: 'pro' }));
                          pushLog('Stripe Portal -> SWAPPED subscription billing index from Basic to Pro.');
                        }}
                        className="py-2.5 px-3 bg-midnight-ink hover:opacity-90 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Upgrade to Pro ($25/mo)
                      </button>
                    )}
                    {user.plan === 'pro' && (
                      <button
                        onClick={() => {
                          setUser((prev) => ({ ...prev, plan: 'basic' }));
                          pushLog('Stripe Portal -> DOWNGRADED subscription index from Pro to Basic.');
                        }}
                        className="py-2.5 px-3 bg-midnight-ink hover:opacity-90 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Downgrade to Basic ($10/mo)
                      </button>
                    )}
                    
                    {user.status === 'Active' ? (
                      <button
                        onClick={() => {
                          setUser((prev) => ({ ...prev, status: 'Canceled' }));
                          pushLog('Stripe Portal -> Triggered subscription cancellation schedule.');
                        }}
                        className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Cancel Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setUser((prev) => ({ ...prev, status: 'Active' }));
                          pushLog('Stripe Portal -> Reactivated premium list cleaning.');
                        }}
                        className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Reactivate Plan
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Credit card credentials */}
              <div className="bg-whisper-gray p-5 rounded-xl border border-light-edge space-y-3 mb-6">
                <span className="text-xs font-bold text-midnight-ink block">Payment Method</span>
                <div className="flex items-center justify-between text-xs text-muted-ash">
                  <span className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-muted-ash" />
                    <span>Visa ending in <strong>4242</strong> (Expires 12/2028)</span>
                  </span>
                  <button
                    onClick={() => {
                      pushLog('Stripe Portal -> dummy Visa credentials refreshed.');
                    }}
                    className="text-midnight-ink hover:underline font-bold cursor-pointer"
                  >
                    Edit Card
                  </button>
                </div>
              </div>

              <button
                onClick={() => navigateTo('dashboard')}
                className="w-full py-3 bg-[#ffe01b] hover:bg-[#ebd018] text-midnight-ink font-bold text-xs rounded-lg tracking-wider uppercase transition cursor-pointer border border-[#241c15]/10"
              >
                Return to ChimpSweep
              </button>

            </div>
          </div>
        )}

        {/* =========================================================================
            H. MAIN DASHBOARD VIEW
            ========================================================================= */}
        {route === 'dashboard' && (
          <div className="flex-1 flex flex-col bg-white">
            
            {/* Dashboard Inner Navbar */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#11111108] h-16 flex items-center justify-between px-6 md:px-10 z-10">
              
              {/* Left Side: Logo & Name */}
              <div onClick={() => navigateTo('landing')} className="flex items-center gap-2 cursor-pointer select-none font-sans">
                <span className="font-extrabold tracking-tighter text-xl text-midnight-ink font-sans">
                  Chimp<span className="text-[#d8be14]">Sweep</span>
                </span>
              </div>

              {/* Center: Standard Tabs Row */}
              <nav className="flex items-center border border-[#11111108] bg-whisper-gray rounded-lg p-1 space-x-1 shadow-inner h-10">
                {(['overview', 'health', 'history', 'settings'] as const).map((tab) => {
                  const isActive = dashboardTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setDashboardTab(tab);
                        pushLog(`Switched view state to dashboard tab [${tab}]`);
                      }}
                      className={`px-3 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-white/85 backdrop-blur-md border border-white/60 text-midnight-ink shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                          : 'text-muted-ash hover:text-midnight-ink hover:bg-[#11111105]'
                      }`}
                    >
                      {tab === 'overview' && <Layers className="w-3.5 h-3.5" />}
                      {tab === 'health' && <Activity className="w-3.5 h-3.5" />}
                      {tab === 'history' && <HistoryIcon className="w-3.5 h-3.5" />}
                      {tab === 'settings' && <Settings className="w-3.5 h-3.5" />}
                      
                      <span className="hidden md:inline">
                        {tab === 'overview' && 'Overview'}
                        {tab === 'health' && 'Health'}
                        {tab === 'history' && 'History'}
                        {tab === 'settings' && 'Settings'}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Right Side: Connected Account & Manage Billing button */}
              <div className="flex items-center space-x-4">
                <div className="hidden lg:block text-right font-sans">
                  <p className="text-[9px] text-muted-ash leading-none uppercase tracking-wider font-bold">Mailchimp Connected</p>
                  <p className="text-[10px] font-bold text-midnight-ink select-none truncate max-w-[140px] mt-0.5">{user.email}</p>
                </div>
                
                <button
                  onClick={() => {
                    pushLog('POST /api/billing/portal -> Redirecting user to Stripe Customer Billing Portal');
                    handleOpenBillingPortal();
                  }}
                  className="bg-[#ffe01b] hover:bg-[#ebd018] text-midnight-ink font-bold text-xs px-3.5 py-2.5 rounded-lg transition-all border border-[#241c15]/10 cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5 text-midnight-ink" />
                  <span>Manage Billing</span>
                </button>
              </div>

            </header>

            {/* Dashboard Workspace */}
            <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
              
              {/* Active Plan Indicator Alert Badge */}
              <div className="mb-6 flex flex-col md:flex-row items-center justify-between border border-[#11111108] bg-whisper-gray/40 p-4 rounded-xl">
                <div className="flex items-center space-x-2 pb-2 md:pb-0">
                  <div className={`w-2 h-2 rounded-full animate-ping ${user.plan === 'pro' ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                  <p className="text-xs font-semibold text-[#111111]">
                    Status: <span className="uppercase text-emerald-600 font-bold">{user.status}</span> Subscription ({user.plan.toUpperCase()} Plan)
                  </p>
                </div>
                <p className="text-[11px] text-[#6d6c6b] font-sans">
                  Next standard billing checkpoint: <strong>{user.renewalDate}</strong>
                </p>
              </div>

              {/* TAB 1: OVERVIEW */}
              {dashboardTab === 'overview' && (
                <div className="space-y-6">
                  
                  {/* Stats Block */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    
                    <div className="bg-whisper-gray p-6 rounded-xl border border-[#11111108] shadow-subtle relative overflow-hidden group">
                      <p className="text-[11px] text-[#6d6c6b] uppercase font-mono tracking-wider font-bold">Unsubscribed</p>
                      <h3 className="text-3xl font-black mt-2 text-midnight-ink tracking-tight">
                        {summary.unsubscribed_count.toLocaleString()}
                      </h3>
                      <p className="text-xs text-[#6d6c6b] mt-1">Billed contacts who opted out</p>
                    </div>

                    <div className="bg-whisper-gray p-6 rounded-xl border border-[#11111108] shadow-subtle relative overflow-hidden group">
                      <p className="text-[11px] text-[#6d6c6b] uppercase font-mono tracking-wider font-bold">Bounced</p>
                      <h3 className="text-3xl font-black mt-2 text-midnight-ink tracking-tight">
                        {summary.bounced_count.toLocaleString()}
                      </h3>
                      <p className="text-xs text-[#6d6c6b] mt-1">Permanently invalid hard addresses</p>
                    </div>

                    <div className="bg-whisper-gray p-6 rounded-xl border border-[#11111108] shadow-subtle relative overflow-hidden group">
                      <p className="text-[11px] text-[#6d6c6b] uppercase font-mono tracking-wider font-bold">Duplicates</p>
                      <h3 className="text-3xl font-black mt-2 text-midnight-ink tracking-tight">
                        {summary.duplicate_count.toLocaleString()}
                      </h3>
                      <p className="text-xs text-[#6d6c6b] mt-1">Billed redundant duplicate records</p>
                    </div>

                    <div className="bg-midnight-ink p-6 rounded-xl border border-midnight-ink shadow-sm relative overflow-hidden text-white">
                      <p className="text-[11px] text-zinc-300 uppercase font-mono tracking-wider font-bold">Estimated Savings</p>
                      <h3 className="text-3xl font-black mt-2 text-white tracking-tight">
                        ${(summary.estimated_savings_cents / 100).toFixed(2)}
                      </h3>
                      <p className="text-xs text-zinc-300 mt-1">On your next Mailchimp bill</p>
                    </div>

                  </div>

                  {/* Savings rule highlight banner */}
                  <div className="bg-whisper-gray border border-[#11111108] rounded-xl p-4 flex items-start space-x-3">
                    <Info className="w-5 h-5 text-midnight-ink flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-midnight-ink">Crucial Billing Cycle Rule Reminder:</h4>
                      <p className="text-xs text-[#6d6c6b] mt-0.5 leading-relaxed font-sans">
                        Archiving contacts today will reduce your <strong>NEXT</strong> Mailchimp billing cycle bill. You'll observe full realized savings on your next statement invoice (30 days or less).
                      </p>
                    </div>
                  </div>

                  {/* Operational Clean button layout */}
                  <div className="bg-white p-8 rounded-xl border border-[#11111108] shadow-subtle flex flex-col items-center justify-center text-center">
                    {totalWasteContacts > 0 ? (
                      <div className="max-w-md">
                        <div className="w-12 h-12 rounded-full bg-midnight-ink text-[#fff] flex items-center justify-center mx-auto mb-4 animate-pulse">
                          <Trash2 className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Cleanup Targets Identified</h3>
                        <p className="text-xs text-muted-ash mb-6 font-sans">
                          ChimpSweep categorized <strong>{totalWasteContacts} wasteful entries</strong> counting towards subscription monthly tiers. Archiving them clears billing tier weight.
                        </p>
                        
                        <button
                          onClick={handleCleanupAction}
                          className="px-8 py-4 bg-[#FFE01B] hover:bg-[#ebd018] text-[#241c15] border border-[#241c15]/10 font-bold text-xs rounded-lg transition-all uppercase tracking-widest cursor-pointer shadow-md select-none transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
                        >
                          Clean Up Now — Archive {totalWasteContacts} Wasteful Contacts
                        </button>
                      </div>
                    ) : (
                      <div className="max-w-lg">
                        <div className="w-12 h-12 rounded-full bg-whisper-gray border border-[#11111108] flex items-center justify-center text-midnight-ink mx-auto mb-4">
                          <Check className="w-4 h-4 text-emerald-505 bg-emerald-500/10 p-0.5 rounded-full" />
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-midnight-ink">Your list is clean!</h3>
                        <p className="text-xs text-muted-ash leading-relaxed mb-4">
                          There are no unsubscribed, bounced, or duplicate contacts to archive right now. Check back after your next email campaign send — new unsubscribes will appear here!
                        </p>
                        <div className="p-3 bg-whisper-gray border border-[#11111108] rounded-xl inline-block text-[11px] font-mono text-[#6d6c6b]">
                          Live List synchronization checks are active.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Refresh audit widget */}
                  <div className="flex justify-between items-center bg-whisper-gray rounded-xl p-3.5 text-xs border border-[#11111108]">
                    <span className="text-[#6d6c6b]">Perform on-demand sync:</span>
                    <button
                      onClick={handleRefreshStats}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#11111108] rounded-lg hover:bg-whisper-gray transition text-midnight-ink font-semibold cursor-pointer text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-midnight-ink" />
                      <span>Refresh Active Scan</span>
                    </button>
                  </div>

                </div>
              )}

              {/* TAB 2: HEALTH SCORE */}
              {dashboardTab === 'health' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Visual Meter & Analysis */}
                  <div className="lg:col-span-5 bg-white rounded-2xl border border-[#11111108] p-8 shadow-subtle flex flex-col justify-between items-center min-h-[460px]">
                    <div className="w-full flex justify-between items-center mb-2">
                      <span className="text-[9px] font-mono uppercase bg-midnight-ink text-white px-2.5 py-1 rounded-full font-bold tracking-wider">
                        Real-time Diagnostics
                      </span>
                      <span className="text-[10px] font-mono text-muted-ash">v2.1 snapshot</span>
                    </div>

                    <div className="flex flex-col items-center text-center my-6">
                      {/* SVG Gauge */}
                      <div className="relative flex items-center justify-center w-40 h-40">
                        {/* Background Ring */}
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="80"
                            cy="80"
                            r="66"
                            className="stroke-[#1111110a]"
                            strokeWidth="10"
                            fill="transparent"
                          />
                          {/* Animated Progress Ring */}
                          <circle
                            cx="80"
                            cy="80"
                            r="66"
                            className={`transition-all duration-1000 ease-out ${
                              summary.health_score < 40 ? 'stroke-rose-500' :
                              summary.health_score < 60 ? 'stroke-amber-400' :
                              summary.health_score < 80 ? 'stroke-indigo-500' :
                              'stroke-emerald-500'
                            }`}
                            strokeWidth="10"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 66}`}
                            strokeDashoffset={`${2 * Math.PI * 66 * (1 - summary.health_score / 100)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        
                        {/* Central Score Text */}
                        <div className="absolute flex flex-col items-center">
                          <span className="text-5xl font-extrabold tracking-tighter text-midnight-ink font-sans">
                            {summary.health_score}
                          </span>
                          <span className="text-[9px] text-muted-ash font-bold uppercase tracking-wider mt-0.5">SCORE</span>
                        </div>
                      </div>

                      {/* Classification Description */}
                      <h3 className="text-xl font-bold text-midnight-ink mt-6 mb-1">
                        List Health is {summary.health_score < 40 ? 'Critical' :
                                       summary.health_score < 60 ? 'Fair' :
                                       summary.health_score < 80 ? 'Good' : 'Excellent'}
                      </h3>
                      
                      <p className="text-[11px] text-muted-ash max-w-[240px] leading-relaxed mb-4 font-sans">
                        {summary.health_score < 40 ? 'Your list has a high proportion of dead-weight accounts risking blacklists.' :
                         summary.health_score < 60 ? 'Your list is accumulating significant double-billed accounts and high bounces.' :
                         summary.health_score < 80 ? 'Your list is performing well but has potential optimization opportunities.' :
                         'Perfect optimization. Your list is entirely clean of billing drag!'}
                      </p>

                      <div className="flex items-center space-x-1.5 bg-whisper-gray px-3 py-1.5 rounded-full border border-[#11111108]">
                        <span className="w-1.5 h-1.5 rounded-full animate-ping bg-emerald-500"></span>
                        <span className="text-[10px] font-sans text-muted-ash font-semibold">Classification:</span>
                        <span className={`text-[10px] font-bold ${
                          summary.health_score < 40 ? 'text-rose-600' :
                          summary.health_score < 60 ? 'text-amber-600' :
                          summary.health_score < 80 ? 'text-indigo-600' :
                          'text-emerald-600'
                        }`}>
                          {summary.health_score < 40 ? 'Poor Status' :
                           summary.health_score < 60 ? 'Fair Status' :
                           summary.health_score < 80 ? 'Good Status' : 'Excellent Status'}
                        </span>
                      </div>
                    </div>

                    <div className="w-full text-center text-[10px] text-zinc-400 font-sans">
                       Calculated via public Mailchimp billing index ratios
                    </div>
                  </div>

                  {/* Right Column: Audit Profile Breakdown & Actions */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-[#11111108] p-8 shadow-subtle flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h4 className="text-base font-bold text-midnight-ink">Breakdown Diagnostics & Profile Audit</h4>
                          <p className="text-[11px] text-muted-ash font-sans">Visual segmentation of dead-weight vs value-adding accounts</p>
                        </div>
                        <span className="text-[11px] font-mono text-[#6d6c6b] bg-whisper-gray px-2.5 py-1 rounded border border-[#11111108] h-max">
                          5,000 baseline rows
                        </span>
                      </div>

                      {/* Visual segment breakdown with color bars */}
                      <div className="space-y-6">
                        {/* Subscribed active */}
                        <div>
                          <div className="flex justify-between text-xs mb-1.5 font-sans">
                            <span className="text-midnight-ink font-medium flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
                              Active Subscribers (Value-adding)
                            </span>
                            <span className="font-bold text-midnight-ink">
                              {5000 - totalWasteContacts} / 5,000 ({((5000 - totalWasteContacts) / 5000 * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#11111108] h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${((5000 - totalWasteContacts) / 5000 * 100)}%` }}></div>
                          </div>
                        </div>

                        {/* Unsubscribed */}
                        <div>
                          <div className="flex justify-between text-xs mb-1.5 font-sans">
                            <span className="text-midnight-ink font-medium flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-red-400 inline-block"></span>
                              Unsubscribed Contacts (Billing drag)
                            </span>
                            <span className="font-bold text-red-500">
                              {summary.unsubscribed_count} / 5,000 ({((summary.unsubscribed_count) / 5000 * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#11111108] h-2 rounded-full overflow-hidden">
                            <div className="bg-red-400 h-full rounded-full transition-all duration-1000" style={{ width: `${((summary.unsubscribed_count) / 5000 * 100)}%` }}></div>
                          </div>
                        </div>

                        {/* Bounced */}
                        <div>
                          <div className="flex justify-between text-xs mb-1.5 font-sans">
                            <span className="text-midnight-ink font-medium flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>
                              Hard-Bounced Addresses (Invalid drag)
                            </span>
                            <span className="font-bold text-amber-500">
                              {summary.bounced_count} / 5,000 ({((summary.bounced_count) / 5000 * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#11111108] h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${((summary.bounced_count) / 5000 * 100)}%` }}></div>
                          </div>
                        </div>

                        {/* Duplicates */}
                        <div>
                          <div className="flex justify-between text-xs mb-1.5 font-sans">
                            <span className="text-midnight-ink font-medium flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block"></span>
                              Duplicate Entries (Double-billing)
                            </span>
                            <span className="font-bold text-indigo-500">
                              {summary.duplicate_count} / 5,000 ({((summary.duplicate_count) / 5000 * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#11111108] h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${((summary.duplicate_count) / 5000 * 100)}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recommendation callout and spaced buttons */}
                    <div className="pt-6 mt-6 border-t border-[#11111108]">
                      {totalWasteContacts > 0 ? (
                        <div className="bg-[#FFE01B]/10 border border-[#FFE01B]/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="font-sans text-xs">
                            <h5 className="font-bold text-midnight-ink mb-1">Clean list sweep recommended</h5>
                            <p className="text-[#645700] leading-relaxed">
                              You have <strong>{totalWasteContacts} dead-weight contacts</strong> costing you extra budget. Archiving these segment rows will lower your tier instantly on the next billing date.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div className="font-sans text-xs">
                            <h5 className="font-bold text-emerald-800 mb-1">List Optimization Perfected</h5>
                            <p className="text-emerald-700 leading-relaxed">
                              Great news! There are no wasteful accounts. Your current Mailchimp list is perfectly optimized for lowest possible monthly pricing.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <span className="text-[11px] text-muted-ash font-sans">
                          Snapshot status: <strong className="text-midnight-ink">Active Real-Time Sync</strong>
                        </span>
                        
                        <div className="flex space-x-2.5 w-full sm:w-auto">
                          <button
                            onClick={() => {
                              pushLog('POST /api/health/diagnostics -> Refreshing raw Mailchimp audience lists');
                              handleRefreshStats();
                            }}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-whisper-gray hover:bg-neutral-200 text-midnight-ink font-semibold text-xs rounded-lg transition border border-[#11111108] cursor-pointer text-center font-sans whitespace-nowrap"
                          >
                            Refresh Diagnostics
                          </button>
                          
                          {totalWasteContacts > 0 && (
                            <button
                              onClick={() => setDashboardTab('overview')}
                              className="flex-1 sm:flex-none px-5 py-2.5 bg-[#FFE01B] hover:bg-[#ebd018] text-midnight-ink border border-[#241c15]/10 font-bold text-xs rounded-lg transition cursor-pointer text-center font-sans whitespace-nowrap"
                            >
                              Sweep Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 3: HISTORY */}
              {dashboardTab === 'history' && (
                <div className="bg-white rounded-xl border border-[#11111108] shadow-subtle overflow-hidden">
                  
                  <div className="p-6 border-b border-[#11111108] flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-midnight-ink">Audit Archiving Log Register</h3>
                      <p className="text-xs text-[#6d6c6b] mt-0.5">Historical list updates completed on connected Mailchimp auditer</p>
                    </div>
                    {user.plan !== 'pro' && (
                      <span className="text-[9px] bg-whisper-gray text-muted-ash border border-[#11111108] px-2.5 py-1 rounded-full font-bold uppercase">Pro Undo Feature Locked</span>
                    )}
                  </div>

                  {history.length === 0 ? (
                    <div className="p-12 text-center text-[#6d6c6b] text-sm font-sans">
                      No cleanups recorded yet. Go to Overview and perform your first list optimization.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#11111108] font-sans">
                      {history.map((run) => (
                        <div key={run.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-mono font-bold text-[#111111]">{run.date}</span>
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                                run.type === 'Manual' ? 'bg-whisper-gray border border-[#11111108] text-[#111111]' : 'bg-slate-100 text-slate-800'
                              }`}>
                                {run.type}
                              </span>
                            </div>
                            <div className="text-xs space-x-4 text-muted-ash">
                              <span>Archived: <strong>{run.count} wasteful contacts</strong></span>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">Estimated Lowering: ~${(run.savingsCents / 100).toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="text-right mr-2 md:mr-0">
                              <span className={`inline-flex items-center space-x-1 text-xs font-bold ${
                                run.status === 'Completed' ? 'text-emerald-600' : 'text-zinc-400 line-through'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${run.status === 'Completed' ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
                                <span>{run.status}</span>
                              </span>
                            </div>

                            {/* Undo Actions */}
                            {run.status === 'Completed' && (
                              user.plan === 'pro' ? (
                                <button
                                  onClick={() => setConfirmUndoRunId(run.id)}
                                  className="px-3.5 py-1.5 bg-midnight-ink text-white rounded-lg text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-sm"
                                >
                                  Undo Archives
                                </button>
                              ) : (
                                <div className="group relative">
                                  <button className="px-3.5 py-1.5 bg-whisper-gray border border-[#11111108] text-zinc-400 rounded-lg text-xs font-bold cursor-not-allowed">
                                    Undo Archive
                                  </button>
                                  <div className="absolute right-0 bottom-full mb-1 w-52 bg-midnight-ink text-white text-[10px] p-2.5 rounded-lg hidden group-hover:block z-20 leading-relaxed font-sans shadow-lg">
                                    <strong>Basic Plan:</strong> Rollback is a Pro feature. Upgrade to restore contacts within 30 days of cleanup.
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Confirmation Modal overlay inside tab */}
                  {confirmUndoRunId && (
                    <div className="bg-whisper-gray border-t border-[#11111108] p-5 flex flex-col items-center justify-center text-center">
                      <div className="max-w-md bg-white border border-[#11111108] rounded-xl p-5 shadow-subtle">
                        <AlertTriangle className="w-8 h-8 text-[#e16540] mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-[#111111] font-sans">Verify Undo Rollback Request</h4>
                        <p className="text-xs text-muted-ash mt-1 mb-4 leading-normal font-sans">
                          Are you sure? This will restore all associated contacts from cleanup pool back to their active list indices. They will resume billing pool calculation tiers.
                        </p>
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => setConfirmUndoRunId(null)}
                            className="px-4 py-2 bg-whisper-gray hover:bg-zinc-200 text-xs font-bold rounded-lg cursor-pointer font-sans text-midnight-ink border border-[#11111108]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUndoRun(confirmUndoRunId)}
                            className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition cursor-pointer font-sans"
                          >
                            Yes, restore them
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 4: SETTINGS */}
              {dashboardTab === 'settings' && (
                <div className="space-y-6">
                  
                  {/* Connected Accounts */}
                  <div className="bg-white p-6 rounded-xl border border-[#11111108] shadow-subtle">
                    <h3 className="text-xs font-bold text-[#111112] uppercase tracking-wider mb-4 font-mono">Mailchimp Sync Connection</h3>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-whisper-gray rounded-xl border border-[#11111108]">
                      <div>
                        <span className="text-[10px] text-muted-ash font-bold uppercase">Linked Mailchimp Account</span>
                        <p className="text-xs font-bold text-[#111111]">{user.email}</p>
                      </div>
                      
                      <button
                        onClick={() => setShowDisconnectModal(true)}
                        className="mt-3 md:mt-0 text-xs font-bold text-rose-600 hover:underline cursor-pointer font-sans"
                      >
                        Disconnect and log out
                      </button>
                    </div>
                  </div>

                  {/* Subscription details */}
                  <div className="bg-white p-6 rounded-xl border border-[#11111108] shadow-subtle space-y-4">
                    <h3 className="text-xs font-bold text-[#111112] uppercase tracking-wider font-mono">Plan Subscription</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-xs">
                      <div className="p-3.5 bg-whisper-gray border border-[#11111108] rounded-xl">
                        <span className="text-[10px] text-muted-ash block uppercase font-bold">Current Tier</span>
                        <strong className="text-midnight-ink block mt-1 capitalize text-sm">{user.plan} (${user.plan === 'pro' ? '25' : '10'}/mo)</strong>
                      </div>
                      <div className="p-3.5 bg-whisper-gray border border-[#11111108] rounded-xl">
                        <span className="text-[10px] text-muted-ash block uppercase font-bold">Billing Status</span>
                        <strong className="text-emerald-700 block mt-1 text-sm uppercase font-bold">{user.status}</strong>
                      </div>
                      <div className="p-3.5 bg-whisper-gray border border-[#11111108] rounded-xl">
                        <span className="text-[10px] text-muted-ash block uppercase font-bold">Next Invoice Date</span>
                        <strong className="text-midnight-ink block mt-1 text-sm">{user.renewalDate}</strong>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleOpenBillingPortal()}
                        className="py-2.5 px-4 bg-midnight-ink hover:opacity-90 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center space-x-1.5 shadow-sm uppercase tracking-wider"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-white" />
                        <span>Manage Payment Options in Stripe Portal</span>
                      </button>
                    </div>
                  </div>

                  {/* Upgrades panel if Basic */}
                  {user.plan === 'basic' && (
                    <div className="bg-whisper-gray p-6 rounded-xl border-2 border-midnight-ink relative overflow-hidden">
                      <span className="absolute -top-3 right-6 bg-midnight-ink text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Automate operations</span>
                      
                      <h4 className="text-base font-bold text-[#111111] mb-2">Upgrade to Pro Version</h4>
                      <p className="text-xs text-[#6d6c6b] max-w-xl leading-relaxed mb-4 font-sans">
                        Get automatic weekly cleanup — every Monday, ChimpSweep runs a background sweeping snapshot for you with no action. Plus 30-day index rollbacks to restore contacts safely. All for $25/month.
                      </p>

                      <button
                        onClick={() => handleSelectPlan('pro')}
                        className="px-5 py-2.5 bg-midnight-ink hover:opacity-90 text-white font-bold text-xs rounded-lg transition-all shadow-sm cursor-pointer uppercase tracking-widest"
                      >
                        Upgrade to Pro for $25/month
                      </button>
                    </div>
                  )}

                  {/* Disconnect Failsafe confirmation modal */}
                  {showDisconnectModal && (
                    <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-6 text-center font-sans space-y-3">
                      <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                      <h4 className="text-sm font-bold text-midnight-ink">Disconnect Mailchimp Profile Settings?</h4>
                      <p className="text-xs text-[#6d6c6b] max-w-md mx-auto leading-normal">
                        This will log you out and disconnect ChimpSweep from your Mailchimp account. Your subscription indices will remain on Stripe registry until the billing cycle expires. Are you sure?
                      </p>
                      <div className="flex justify-center space-x-2 pt-2">
                        <button
                          onClick={() => setShowDisconnectModal(false)}
                          className="px-4 py-2 bg-white border border-[#11111108] rounded-lg text-xs cursor-pointer font-bold text-muted-ash"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleLogout}
                          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Yes, Disconnect
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </main>

            {/* Dashboard Footer */}
            <footer className="bg-white py-6 px-6 md:px-12 border-t border-[#11111108] text-center text-[11px] text-muted-ash font-sans">
              <p>© 2026 ChimpSweep. All rights reserved.</p>
            </footer>

          </div>
        )}

        {/* =========================================================================
            I. PRIVACY POLICY PAGE
            ========================================================================= */}
        {route === 'privacy' && (
          <div className="flex-1 bg-[#ffffff] py-12 px-6 max-w-3xl mx-auto w-full leading-relaxed select-text">
            <button
              onClick={() => navigateTo('landing')}
              className="text-xs text-zinc-400 hover:text-midnight-ink mb-6 flex items-center space-x-1 cursor-pointer"
            >
              <span>← Back to ChimpSweep</span>
            </button>
            
            <h1 className="text-2xl font-black text-[#111111] mb-1">ChimpSweep Privacy Policy</h1>
            <p className="text-xs text-[#6d6c6b] mb-8 font-sans">Last updated: June 1, 2026</p>
 
            <div className="space-y-6 text-xs md:text-sm text-zinc-700">
              <p><strong>1. Introduction</strong><br />ChimpSweep ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our service at chimpsweep.com. By using ChimpSweep, you agree to the practices described in this policy.</p>
              <p><strong>2. Information We Collect</strong><br />When you connect your Mailchimp account to ChimpSweep, we collect and store the following: your Mailchimp account email address; a Mailchimp OAuth access token that allows ChimpSweep to read your audience and archive contacts on your behalf; your Mailchimp server prefix (such as "us1"), which is required to send API requests to the correct Mailchimp server; aggregated statistics about your audience such as unsubscribed, bounced, and duplicate contact counts; and a log of cleanup actions taken within ChimpSweep, including which contacts were archived and when, so the undo feature can work correctly. We do not collect your Mailchimp password. Authentication is handled through Mailchimp's official OAuth 2.0 system. Payment information is collected and processed by Stripe. ChimpSweep does not store your credit card number or any raw card data.</p>
              <p><strong>3. How We Use Your Information</strong><br />We use your information solely to provide the ChimpSweep service — scanning your Mailchimp audience, displaying waste summaries, archiving contacts on your instruction, enabling the 30-day undo feature, running the automated weekly cleanup for Pro subscribers, processing subscription payments, and communicating with you about your account. We do not sell your data. We do not use your data for advertising. We do not share your data with any third party except as described below.</p>
              <p><strong>4. Third-Party Services</strong><br />ChimpSweep integrates with: Mailchimp (The Rocket Science Group, LLC) for audience access via OAuth; Stripe, Inc. for payment processing; Supabase, Inc. as our database provider; and Render Services, Inc. as our hosting provider. Your use of ChimpSweep means you are also subject to their respective privacy policies.</p>
              <p><strong>5. Data Retention</strong><br />We retain your account information for as long as your account is active. Cleanup logs and archived contact records are kept for 30 days to enable undo, then automatically deleted. If you cancel and request account deletion, we will delete all data associated with your account within 30 days.</p>
              <p><strong>6. Security</strong><br />Your Mailchimp access token and account data are stored in an encrypted database. All data in transit is protected by HTTPS. Access to production systems is restricted to authorized personnel only. No method of internet transmission is 100% secure and we cannot guarantee absolute security.</p>
              <p><strong>7. Your Rights</strong><br />You have the right to request a copy of your personal data, to request correction of inaccurate data, and to request deletion of your account and all associated data. To exercise any of these rights, contact us at privacy@chimpsweep.com.</p>
              <p><strong>8. Children's Privacy</strong><br />ChimpSweep is not intended for anyone under 18. We do not knowingly collect personal information from children. If you believe a child has provided us their information, contact us and we will delete it.</p>
              <p><strong>9. Changes to This Policy</strong><br />We may update this Privacy Policy from time to time. Material changes will be noted by updating the date at the top. Continued use of ChimpSweep after changes constitutes acceptance.</p>
              <p><strong>10. Contact</strong><br />Questions about this Privacy Policy? Email us at privacy@chimpsweep.com.</p>
            </div>
          </div>
        )}
 
        {/* =========================================================================
            J. TERMS OF SERVICE PAGE
            ========================================================================= */}
        {route === 'terms' && (
          <div className="flex-1 bg-[#ffffff] py-12 px-6 max-w-3xl mx-auto w-full leading-relaxed select-text">
            <button
              onClick={() => navigateTo('landing')}
              className="text-xs text-zinc-400 hover:text-midnight-ink mb-6 flex items-center space-x-1 cursor-pointer"
            >
              <span>← Back to ChimpSweep</span>
            </button>
            
            <h1 className="text-2xl font-black text-[#111111] mb-1">ChimpSweep Terms of Service</h1>
            <p className="text-xs text-[#6d6c6b] mb-8 font-sans">Last updated: June 1, 2026</p>
 
            <div className="space-y-6 text-xs md:text-sm text-zinc-700">
              <p><strong>1. Agreement to Terms</strong><br />These Terms of Service govern your use of ChimpSweep. By accessing or using ChimpSweep, you agree to be bound by these Terms. If you do not agree, do not use the service.</p>
              <p><strong>2. Description of Service</strong><br />ChimpSweep is a subscription-based software service that connects to your Mailchimp account via OAuth, analyzes your audience for unsubscribed contacts, bounced addresses, and duplicate entries, and provides tools to archive those contacts to reduce your Mailchimp billing costs. Two paid tiers are available: Basic at $10 per month and Pro at $25 per month.</p>
              <p><strong>3. Eligibility</strong><br />You must have a valid Mailchimp account and be at least 18 years of age to use ChimpSweep. You are responsible for all activity that occurs under your account.</p>
              <p><strong>4. Subscriptions and Billing</strong><br />ChimpSweep is billed monthly. By subscribing you authorize us to charge your payment method on a recurring monthly basis until you cancel. All fees are non-refundable except as required by law. You may cancel at any time through the billing portal in your account settings. Cancellation takes effect at the end of your current billing period and you retain access until that date.</p>
              <p><strong>5. Use of Mailchimp Data</strong><br />By connecting your Mailchimp account you grant ChimpSweep permission to read your audience data and archive contacts on your behalf. You confirm you are the owner or authorized administrator of the connected account. ChimpSweep will not add contacts to your list, send emails on your behalf, or modify your Mailchimp settings beyond the archiving actions you explicitly initiate or that are covered by your auto-cleanup subscription.</p>
              <p><strong>6. Important Notice Regarding Savings</strong><br />Mailchimp determines your billing tier based on your contact count at the start of each billing cycle, not in real time. Contacts archived during a billing cycle will reduce your costs starting with your next billing cycle, not the current one. Savings estimates shown in ChimpSweep are approximations based on publicly available Mailchimp pricing. Actual savings may vary. ChimpSweep makes no guarantee of specific savings amounts.</p>
              <p><strong>7. Acceptable Use</strong><br />You agree not to use ChimpSweep in violation of any applicable law, not to attempt unauthorized access to our systems, not to reverse engineer the service, and not to use ChimpSweep to manage Mailchimp accounts you do not own or are not authorized to manage.</p>
              <p><strong>8. Disclaimer of Warranties</strong><br />ChimpSweep is provided "as is" and "as available" without warranties of any kind. We do not warrant that the service will be uninterrupted or error-free or that any specific savings will be achieved.</p>
              <p><strong>9. Limitation of Liability</strong><br />ChimpSweep shall not be liable for any indirect, incidental, special, consequential, or punitive damages. ChimpSweep's total liability for any claim shall not exceed the amount you paid to ChimpSweep in the twelve months preceding the claim.</p>
              <p><strong>10. Indemnification</strong><br />You agree to indemnify and hold harmless ChimpSweep and its team from any claims, damages, or expenses arising from your use of the service or your violation of these Terms.</p>
              <p><strong>11. Termination</strong><br />We may suspend or terminate your access at any time if we believe you have violated these Terms. If we terminate without cause, we will provide a prorated refund for unused subscription days.</p>
              <p><strong>12. Changes to Terms</strong><br />We may modify these Terms at any time. Continued use after changes are posted constitutes acceptance.</p>
              <p><strong>13. Governing Law</strong><br />These Terms are governed by the laws of the State of Delaware, United States.</p>
              <p><strong>14. Contact</strong><br />Questions about these Terms? Email us at legal@chimpsweep.com.</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
