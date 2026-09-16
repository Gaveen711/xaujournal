import { useEffect, useState } from 'react';
import { useAppServices } from '../app/di/AppServicesContext.jsx';
import { useToast } from '../components/ToastContext.jsx';
import { getEntitlements } from '../lib/entitlements.js';

const FREE_SUBSCRIPTION = {
  plan: 'free', expiry: null, isTrial: false, isTrialExpired: false,
  totalTrades: 0, totalJournals: 0, analytics: null, agreedToTerms: false,
  isFromCache: false, paymentProvider: null, providerSubscriptionId: null,
  subscriptionStatus: null,
};

const PAYPAL_AUTOPAY_URL = 'https://www.paypal.com/myaccount/autopay/';

function newIdempotencyKey() {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isPayPalApprovalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && (url.hostname === 'paypal.com' || url.hostname.endsWith('.paypal.com'));
  } catch {
    return false;
  }
}

/** Maps subscription persistence into UI-ready entitlement state and actions. */
export function useSubscription(user) {
  const [subscription, setSubscription] = useState({ ...FREE_SUBSCRIPTION, isLoading: true });
  const toast = useToast();
  const { auth, subscriptionRepository: repository } = useAppServices();

  useEffect(() => {
    if (!user) {
      setSubscription({ ...FREE_SUBSCRIPTION, isLoading: false });
      return undefined;
    }
    return repository.subscribeToUserDoc(user.uid, (docSnap) => {
      if (!docSnap.exists()) {
        user.getIdToken().then((token) => fetch('/api/init-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }).catch((error) => console.error('[useSubscription] server-side init failed:', error)));
        setSubscription({ ...FREE_SUBSCRIPTION, isLoading: true });
        return;
      }

      const data = docSnap.data();
      // With the persistent cache the first snapshot can come off disk before
      // the server confirms. Harmless for counters and the plan badge, which
      // self-correct a moment later — but the consent gate must not act on a
      // stale value, so it waits for a server-backed read.
      const isFromCache = docSnap.metadata?.fromCache ?? false;
      const expiryDate = data.planExpiry ? new Date(data.planExpiry) : null;
      const now = new Date();
      // Server fields are interpreted verbatim: the webhook writes
      // plan/planExpiry/graceUntil, and hasPaidAccess is the same predicate
      // the API enforces — so the UI never promises access a route will 403.
      const entitlements = getEntitlements(data);
      const common = {
        expiry: data.planExpiry || null,
        totalTrades: data.totalTradesLogged || 0,
        totalJournals: data.totalJournalsLogged || 0,
        analytics: data.analytics || null,
        agreedToTerms: data.agreedToTerms || false,
        isLoading: false,
        isFromCache,
        paymentProvider: data.paymentProvider || data.subscription?.provider || null,
        providerSubscriptionId: data.providerSubscriptionId
          || data.subscription?.providerSubscriptionId
          || data.subscription?.subscriptionId
          || null,
        subscriptionStatus: data.subscriptionStatus || data.subscription?.status || null,
      };
      if (entitlements.isPaid) {
        setSubscription({
          ...common,
          plan: data.plan,
          isTrial: data.isTrial || false,
          isTrialExpired: false,
          isGracePeriod: entitlements.isGrace,
        });
      } else {
        setSubscription({
          ...common,
          plan: 'free',
          isTrial: false,
          isTrialExpired: Boolean(data.isTrial && expiryDate && now > expiryDate),
        });
      }
    }, (error) => console.error('[useSubscription] snap subscription error:', error));
  }, [repository, user]);

  const startCheckout = async (planType = 'pro_monthly') => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast('You must be logged in to subscribe.', 'error');
      return false;
    }
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/paypal/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: planType, idempotencyKey: newIdempotencyKey() }),
      });
      const payload = await response.json().catch(() => ({}));
      const approvalUrl = payload.approvalUrl
        || payload.approval_url
        || payload.subscription?.approvalUrl
        || payload.checkoutUrl;
      if (!response.ok || !isPayPalApprovalUrl(approvalUrl)) {
        throw new Error(payload.message || payload.error || 'PayPal checkout is currently unavailable.');
      }
      window.location.assign(approvalUrl);
      return true;
    } catch (error) {
      console.error('Failed to start PayPal checkout:', error);
      toast(error?.message || 'Could not open PayPal. Please try again.', 'error');
      return false;
    }
  };
  const openPortal = () => {
    const opened = window.open(PAYPAL_AUTOPAY_URL, '_blank', 'noopener,noreferrer');
    if (!opened) {
      toast('Allow pop-ups to manage your recurring payment in PayPal.', 'info');
    }
  };
  const recordProAcceptance = async () => {
    try {
      await repository.recordProAcceptance(user.uid);
      return true;
    } catch (error) {
      console.error('Legal Acceptance Error:', error);
      toast('Failed to record legal signature. Please try again.', 'error');
      return false;
    }
  };
  const agreeToTerms = async () => {
    try {
      await repository.agreeToTerms(user.uid);
    } catch (error) {
      console.error('Agreement Error:', error);
      toast('Failed to process agreement. Please check your connection.', 'error');
    }
  };

  return { ...subscription, startCheckout, openPortal, agreeToTerms, recordProAcceptance };
}
