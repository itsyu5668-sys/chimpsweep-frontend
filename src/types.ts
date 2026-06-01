/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AudienceSummary {
  unsubscribed_count: number;
  bounced_count: number;
  duplicate_count: number;
  estimated_savings_cents: number;
  health_score: number;
}

export interface UserSubscription {
  email: string;
  plan: 'none' | 'basic' | 'pro';
  status: 'Active' | 'Past Due' | 'Canceled';
  renewalDate: string;
  mailchimpConnected: boolean;
}

export interface CleanupRun {
  id: string;
  date: string;
  timestamp: number;
  type: 'Manual' | 'Auto (weekly)';
  count: number;
  savingsCents: number;
  status: 'Completed' | 'Failed' | 'Reverted';
}

export type PageRoute =
  | 'landing'
  | 'oauth_mailchimp'
  | 'auth_success'
  | 'auth_error'
  | 'pricing'
  | 'checkout'
  | 'stripe_portal'
  | 'dashboard'
  | 'privacy'
  | 'terms';

export type DashboardTab = 'overview' | 'health' | 'history' | 'settings';
