import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircleFill,
  Clock,
  ExclamationTriangle,
  Paypal,
} from 'react-bootstrap-icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { auth } from '../firebaseAuth';

const FINAL_STATUSES = new Set(['active', 'cancelled', 'canceled', 'suspended', 'expired', 'failed']);

function normalizeStatus(value) {
  return String(value || 'confirming').trim().toLowerCase();
}

function recordFrom(payload) {
  return payload?.subscription || payload?.result || payload || null;
}

function copyFor(status, checkoutCancelled) {
  if (checkoutCancelled) {
    return {
      icon: <ArrowLeft aria-hidden="true" />,
      eyebrow: 'PayPal checkout',
      title: 'Checkout cancelled',
      body: 'Nothing was charged. You can return to pricing whenever you are ready.',
    };
  }
  if (status === 'active') {
    return {
      icon: <CheckCircleFill aria-hidden="true" />,
      eyebrow: 'PayPal verified',
      title: 'Pro is active',
      body: 'The server confirmed your PayPal subscription. Your Pro tools are ready.',
    };
  }
  if (status === 'cancelled' || status === 'canceled') {
    return {
      icon: <ExclamationTriangle aria-hidden="true" />,
      eyebrow: 'Subscription update',
      title: 'Subscription cancelled',
      body: 'Future renewals are stopped. Any access already paid for continues through its current period.',
    };
  }
  if (status === 'suspended') {
    return {
      icon: <ExclamationTriangle aria-hidden="true" />,
      eyebrow: 'Subscription update',
      title: 'Payment needs attention',
      body: 'PayPal has suspended the subscription. Review the payment method in your PayPal account.',
    };
  }
  if (status === 'expired') {
    return {
      icon: <ExclamationTriangle aria-hidden="true" />,
      eyebrow: 'Subscription update',
      title: 'Subscription expired',
      body: 'This subscription is no longer active. Choose a plan to start a new PayPal subscription.',
    };
  }
  if (status === 'failed') {
    return {
      icon: <ExclamationTriangle aria-hidden="true" />,
      eyebrow: 'Verification stopped',
      title: 'Subscription not confirmed',
      body: 'PayPal did not confirm an active subscription. No Pro access was granted from this page.',
    };
  }
  return {
    icon: <Clock aria-hidden="true" />,
    eyebrow: 'Server verification',
    title: status === 'approved' ? 'Approval received' : 'Confirming subscription',
    body: 'PayPal returned your approval. The server is checking the subscription before Pro is activated.',
  };
}

function planLabel(planId) {
  return planId === 'pro_yearly' ? 'Pro Yearly' : 'Pro Monthly';
}

export default function PayPalSubscriptionStatus() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subscriptionId = searchParams.get('subscription_id') || searchParams.get('subscriptionID') || '';
  const checkoutCancelled = ['cancelled', 'canceled'].includes(
    normalizeStatus(searchParams.get('state') || searchParams.get('status')),
  );
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(!checkoutCancelled);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const status = normalizeStatus(subscription?.status);
  const content = useMemo(() => copyFor(status, checkoutCancelled), [checkoutCancelled, status]);

  const retry = useCallback(() => {
    setError('');
    setLoading(true);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (checkoutCancelled) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    let timer;

    const request = async (confirm) => {
      const currentUser = auth.currentUser;
      if (!subscriptionId || !currentUser) {
        if (active) {
          setError(subscriptionId ? 'Sign in again to verify this PayPal subscription.' : 'The PayPal subscription reference is missing.');
          setLoading(false);
        }
        return;
      }

      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(
          confirm
            ? '/api/paypal/subscriptions/confirm'
            : `/api/paypal/subscriptions/status?subscription_id=${encodeURIComponent(subscriptionId)}`,
          {
            method: confirm ? 'POST' : 'GET',
            headers: {
              ...(confirm ? { 'Content-Type': 'application/json' } : {}),
              Authorization: `Bearer ${token}`,
            },
            ...(confirm ? { body: JSON.stringify({ subscriptionId }) } : {}),
          },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || payload.error || 'Subscription verification is unavailable.');
        if (!active) return;

        const next = recordFrom(payload);
        if (!next) throw new Error('PayPal returned no subscription details.');
        const nextStatus = normalizeStatus(next.status);
        setSubscription(next);
        setError('');
        setLoading(false);

        if (!FINAL_STATUSES.has(nextStatus)) {
          timer = window.setTimeout(() => request(false), 4000);
        }
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.message || 'Subscription verification is unavailable.');
        setLoading(false);
      }
    };

    request(true);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [attempt, checkoutCancelled, subscriptionId]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-4 sm:p-6" aria-labelledby="paypal-status-title">
      <section className="card-premium w-full max-w-lg space-y-6 p-6 text-center shadow-2xl shadow-primary/10 sm:p-9">
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted/50 text-2xl text-foreground sm:size-20 sm:rounded-[2rem]">
            {loading ? <Clock className="animate-pulse" aria-hidden="true" /> : content.icon}
          </div>
        </div>

        <div className="space-y-3" aria-live="polite" aria-busy={loading}>
          <p className="flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <Paypal aria-hidden="true" /> {content.eyebrow}
          </p>
          <h1 id="paypal-status-title" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {loading ? 'Checking with PayPal' : error ? 'Verification needs attention' : content.title}
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            {error || content.body}
          </p>
        </div>

        {subscription && (
          <dl className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-left text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium text-foreground">{planLabel(subscription.planId)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Billing</dt>
              <dd className="font-medium text-foreground">USD · PayPal</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-mono text-xs uppercase tracking-wider text-foreground">{status}</dd>
            </div>
            {subscription.nextBillingTime && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Next billing date</dt>
                <dd className="font-medium text-foreground">
                  {new Date(subscription.nextBillingTime).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="space-y-3">
          {error && (
            <Button size="lg" className="min-h-11 w-full" onClick={retry}>
              Check again
            </Button>
          )}
          {status === 'active' && !error ? (
            <Button size="lg" className="min-h-11 w-full" onClick={() => navigate('/app')}>
              Go to dashboard <ArrowRight aria-hidden="true" />
            </Button>
          ) : null}
          {(checkoutCancelled || ['cancelled', 'canceled', 'expired', 'failed'].includes(status)) && !error ? (
            <Button size="lg" className="min-h-11 w-full" onClick={() => navigate('/pricing')}>
              Return to pricing
            </Button>
          ) : null}
          <Button variant="outline" size="lg" className="min-h-11 w-full" onClick={() => navigate('/app')}>
            <ArrowLeft aria-hidden="true" /> Return to journal
          </Button>
        </div>
      </section>
    </main>
  );
}
