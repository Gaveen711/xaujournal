import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPayPalSubscription,
  resetPayPalTokenCacheForTest,
  verifyPayPalWebhook,
} from './_paypal.ts';
import { mayGrantPayPalEntitlement, toPublicPayPalSubscription } from './_paypalSubscriptions.ts';

const PLAN_ID = `P-${'A'.repeat(24)}`;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('PayPal server integration', () => {
  beforeEach(() => {
    process.env.PAYPAL_ENV = 'sandbox';
    process.env.PAYPAL_CLIENT_ID = 'sandbox-client-id';
    process.env.PAYPAL_CLIENT_SECRET = 'server-only-secret';
    process.env.PAYPAL_WEBHOOK_ID = 'WEBHOOK123';
    resetPayPalTokenCacheForTest();
    vi.restoreAllMocks();
  });

  it('creates a hosted subscription with the server-selected plan and opaque custom id', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({
        id: 'I-SUBSCRIPTION1',
        status: 'APPROVAL_PENDING',
        plan_id: PLAN_ID,
        custom_id: 'opaque-checkout-id',
        links: [{ rel: 'approve', href: 'https://www.sandbox.paypal.com/approve' }],
      }, 201));
    vi.stubGlobal('fetch', fetchMock);

    await createPayPalSubscription({
      planId: PLAN_ID,
      customId: 'opaque-checkout-id',
      returnUrl: 'https://xaujournal.com/app/billing/subscription-status?provider=paypal',
      cancelUrl: 'https://xaujournal.com/app/billing/subscription-status?provider=paypal&state=cancelled',
      requestId: 'idempotent-request-id',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('https://api-m.sandbox.paypal.com/v1/billing/subscriptions');
    expect(init.headers['PayPal-Request-Id']).toBe('idempotent-request-id');
    expect(init.headers.Prefer).toBe('return=representation');
    expect(JSON.parse(init.body)).toEqual({
      plan_id: PLAN_ID,
      custom_id: 'opaque-checkout-id',
      application_context: {
        return_url: 'https://xaujournal.com/app/billing/subscription-status?provider=paypal',
        cancel_url: 'https://xaujournal.com/app/billing/subscription-status?provider=paypal&state=cancelled',
        user_action: 'SUBSCRIBE_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    });
    expect(init.body).not.toContain('server-only-secret');
  });

  it('posts the unmodified event and transmission headers to PayPal verification', async () => {
    const event = {
      id: 'WH-EVENT1',
      event_type: 'PAYMENT.SALE.COMPLETED',
      resource: { id: 'SALE1', billing_agreement_id: 'I-SUBSCRIPTION1' },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ verification_status: 'SUCCESS' }));
    vi.stubGlobal('fetch', fetchMock);

    const verified = await verifyPayPalWebhook({
      authAlgo: 'SHA256withRSA',
      certUrl: 'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-1',
      transmissionId: 'transmission-1',
      transmissionSig: 'signature-1',
      transmissionTime: '2026-09-04T10:00:00Z',
    }, event);

    expect(verified).toBe(true);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature');
    expect(JSON.parse(init.body)).toEqual({
      auth_algo: 'SHA256withRSA',
      cert_url: 'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-1',
      transmission_id: 'transmission-1',
      transmission_sig: 'signature-1',
      transmission_time: '2026-09-04T10:00:00Z',
      webhook_id: 'WEBHOOK123',
      webhook_event: event,
    });
  });

  it('rejects provider verification failures and malformed certificate urls', async () => {
    const headers = {
      authAlgo: 'SHA256withRSA',
      certUrl: 'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-1',
      transmissionId: 'transmission-1',
      transmissionSig: 'signature-1',
      transmissionTime: '2026-09-04T10:00:00Z',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access-token', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ verification_status: 'FAILURE' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyPayPalWebhook(headers, { id: 'WH-EVENT1' })).resolves.toBe(false);
    await expect(verifyPayPalWebhook(
      { ...headers, certUrl: 'https://attacker.example/cert.pem' },
      { id: 'WH-EVENT2' },
    )).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never grants from ACTIVATED or browser confirmation without a completed sale', () => {
    const canonical = {
      providerStatus: 'ACTIVE',
      nextBillingTime: '2026-10-04T10:00:00.000Z',
      lastPaymentValid: true,
      salePaidAt: '2026-09-04T10:00:00.000Z',
      lastPaymentTime: '2026-09-04T10:00:00.000Z',
      nowMs: Date.parse('2026-09-04T10:01:00.000Z'),
    };
    expect(mayGrantPayPalEntitlement({
      ...canonical,
      eventType: 'BILLING.SUBSCRIPTION.ACTIVATED',
    })).toBe(false);
    expect(mayGrantPayPalEntitlement({
      ...canonical,
      eventType: '',
    })).toBe(false);
    expect(mayGrantPayPalEntitlement({
      ...canonical,
      eventType: 'PAYMENT.SALE.COMPLETED',
    })).toBe(true);
  });

  it('requires canonical last payment timing to match the completed sale event', () => {
    expect(mayGrantPayPalEntitlement({
      eventType: 'PAYMENT.SALE.COMPLETED',
      providerStatus: 'ACTIVE',
      nextBillingTime: '2026-10-04T10:00:00.000Z',
      lastPaymentValid: true,
      salePaidAt: '2026-09-04T10:00:00.000Z',
      lastPaymentTime: '2026-09-04T10:20:00.000Z',
      nowMs: Date.parse('2026-09-04T10:01:00.000Z'),
    })).toBe(false);
  });

  it('keeps canonical ACTIVE in confirming state until a verified sale is recorded', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(toPublicPayPalSubscription({
      status: 'active',
      paymentStatus: 'active',
      currentPeriodEnd: future,
    })).toMatchObject({ status: 'confirming', providerStatus: 'active', entitlementActive: false });
    expect(toPublicPayPalSubscription({
      status: 'active',
      paymentStatus: 'COMPLETED',
      currentPeriodEnd: future,
    })).toMatchObject({ status: 'active', providerStatus: 'active', entitlementActive: true });
    expect(toPublicPayPalSubscription({
      status: 'cancelled',
      paymentStatus: 'COMPLETED',
      currentPeriodEnd: future,
    })).toMatchObject({ status: 'cancelled', entitlementActive: true });
  });
});
