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
    // Map URL slugs to route names (e.g., 'auth/error' -> 'auth_error')
    const pathToRoute: Record<string, PageRoute> = {
      'landing': 'landing',
      'oauth_mailchimp': 'oauth_mailchimp',
      'auth_success': 'auth_success',
      'auth_error': 'auth_error',
      'auth/success': 'auth_success',
      'auth/error': 'auth_error',
      'pricing': 'pricing',
      'checkout': 'checkout',
      'stripe_portal': 'stripe_portal',
      'dashboard': 'dashboard',
      'privacy': 'privacy',
      'terms': 'terms',
    };
    const mappedRoute = pathToRoute[path];
    
    // If URL matches a route, always use it (takes precedence over localStorage)
    if (mappedRoute) return mappedRoute;
    
    // For other routes, check localStorage
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

  // Beta state variables
  const [showBetaInput, setShowBetaInput] = useState(false);
  const [betaCode, setBetaCode] = useState('');
  const [betaError, setBetaError] = useState('');
  const [betaLoading, setBetaLoading] = useState(false);

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

  // Redeem beta code
  const handleRedeemBeta = async () => {
    if (!betaCode.trim()) return;
    setBetaLoading(true);
    setBetaError('');
    try {
      const data = await apiFetch('POST', '/api/auth/redeem-beta', { code: betaCode });
      // Success — go straight to dashboard
      setRoute('dashboard');
      setSuccessBanner('Beta access activated! You have 14 days of full Pro access, on us. Welcome to ChimpSweep 🎉');
    } catch (err: any) {
      setBetaError(err.message || 'Invalid code. Please try again.');
    } finally {
      setBetaLoading(false);
    }
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
      
