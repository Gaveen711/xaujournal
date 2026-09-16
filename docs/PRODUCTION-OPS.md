# Production Operations & Maintenance Guide — xaujournal

This document provides guidelines for maintaining, monitoring, and scaling the **xaujournal** Pro Trade Intelligence Terminal in its production environment using **Option A (Serverless Hybrid: Vercel + Firebase)**.

---

## 1. Secrets Management & Rotation Plan

In production, keeping credentials secure and rotating them regularly is a core security requirement.

### 🔑 Secret References

The application utilizes the following credentials:

| Secret Name | Platform | Used By | Rotation Interval |
|-------------|----------|---------|-------------------|
| `METAAPI_TOKEN` | Vercel & Firebase | Broker Sync API & Cloud Functions | Annually / On compromise |
| `RESEND_API_KEY` | Vercel | Hono API (emails/alerts) | 6 Months |
| `PAYPAL_CLIENT_ID` | Vercel | PayPal REST app identification | When the REST app changes |
| `PAYPAL_CLIENT_SECRET` | Vercel | Hono API (PayPal subscriptions and webhook verification) | 6 Months / On compromise |
| `PAYPAL_WEBHOOK_ID` | Vercel | Verification of PayPal webhook deliveries | When the webhook changes |
| `PAYPAL_ENV` | Vercel | Selects Sandbox or Live PayPal API | Change only during release promotion |
| `PAYPAL_MONTHLY_PLAN_ID` | Vercel | Monthly Pro subscription plan | When monthly pricing/plan changes |
| `PAYPAL_YEARLY_PLAN_ID` | Vercel | Yearly Pro subscription plan | When yearly pricing/plan changes |
| `FIREBASE_TOKEN` | GitHub Secrets | CI/CD (Firebase deployments) | 3 Months |
| `VERCEL_TOKEN` | GitHub Secrets | CI/CD (Vercel deployments) | 3 Months |
| `VERCEL_ORG_ID` | GitHub Secrets | CI/CD (Vercel build linking) | Permanent |
| `VERCEL_PROJECT_ID` | GitHub Secrets | CI/CD (Vercel build linking) | Permanent |

### 🔄 Rotation Steps

#### PayPal subscription setup and release

1. In the PayPal Developer Dashboard, create or select a **Sandbox** REST app.
2. Create one USD subscription product with two active plans whose prices match
   `src/lib/pricing.js`: **$22.99 monthly** and **$228.99 yearly**. Copy their
   `P-...` IDs into `PAYPAL_MONTHLY_PLAN_ID` and `PAYPAL_YEARLY_PLAN_ID`.
3. Add an HTTPS webhook for
   `https://www.xaujournal.com/api/webhooks/paypal` and subscribe it to:
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.REFUNDED`
   - `PAYMENT.SALE.REVERSED`
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
4. Set `PAYPAL_ENV=sandbox`, the REST app client ID and secret, the webhook ID,
   and both plan IDs in Vercel. Deploy the API and Firestore rules together.
5. Complete one small Sandbox monthly subscription and verify all three views:
   PayPal shows the subscription, the customer receives Pro only after the
   completed-sale webhook, and the admin Payments/Subscriptions pages show the
   same IDs, amount, payer, and next billing date.
6. For production, create separate **Live** plans and a Live webhook, then
   replace every PayPal value together and set `PAYPAL_ENV=live`. Never combine
   Sandbox credentials, webhook IDs, or plan IDs with Live values.

PayPal's webhook simulator can check listener reachability, but its mock events
do not support the postback-verification path used by this application. The
release check therefore requires one real Sandbox subscription.

#### A. Firebase Admin SDK / Service Account Rotation
If you suspect the Firebase deployment key is compromised:
1. Go to **Google Cloud Console** → **IAM & Admin** → **Service Accounts**.
2. Locate the Firebase Admin SDK service account (usually `firebase-adminsdk-...`).
3. Click on **Keys** → **Add Key** → **Create New Key (JSON)**.
4. Download the JSON file and encode it as Base64.
5. Update the `FIREBASE_SERVICE_ACCOUNT` environment variable inside your Vercel project configuration.
6. Delete the old compromised key from Google Cloud Console.

#### B. MetaApi Cloud Token Rotation
1. Log in to [MetaApi Cloud Dashboard](https://app.metaapi.cloud).
2. Generate a new API token.
3. Update Vercel environment variables: Set `METAAPI_TOKEN` to the new token.
4. Update Firebase Cloud Functions secrets:
   ```bash
   vercel env rm METAAPI_TOKEN production && vercel env add METAAPI_TOKEN production
   ```
5. Deploy functions to apply the secret change:
   ```bash
   vercel --prod
   ```

---

## 2. Production Monitoring & Logging Setup

To ensure 99.9% uptime, configure active logging, performance monitoring, and incident alerting.

### 📊 Client & API Telemetry (Vercel)
1. **Speed Insights**: Enable **Vercel Speed Insights** in the Vercel dashboard. This tracks client-side Core Web Vitals (LCP, FID, CLS) in real-time.
2. **Web Analytics**: Enable **Vercel Analytics** to monitor traffic spikes and geographical distribution of users.
3. **API Log Streams**: Set up a log drain from Vercel to a log management service (like Datadog, Axiom, or Logflare) to capture Hono backend execution times and `5xx` errors.

### 🪵 Backend & Database Logs (Google Cloud Console)
Firestore reads, writes, and Firebase Cloud Function invocations are logged inside the **Google Cloud Logging (Winston/Stackdriver)** suite.
* Go to the GCP console under **Logging** → **Log Explorer**.
* Filter for `resource.type="cloud_function"` to view broker sync logs.
* Monitor function execution times and timeout alerts. (Note: MetaApi calls are bounded by `withRetryBudget` in `api/_resilience.ts` — a 25s budget per broker sync request).

### 🔔 Alerting Thresholds
Create alert notifications (via Email or Slack) in Google Cloud and Vercel dashboards for the following thresholds:
1. **Cloud Firestore Quota**: Trigger an alert when Firestore reads or writes reach 80% of daily free tier or expected paid budget limits.
2. **Execution Failures**: Alert if Firebase Cloud Function error rate exceeds 2% in a 10-minute window.
3. **HTTP 5xx Spikes**: Alert if Vercel functions return `500 Internal Server Error` on more than 1% of total edge requests.
4. **Billing Alerts**: Set up budget alerts on Vercel ($10-$50 soft limit) and Google Cloud Billing console to avoid runaway costs.

---

## 3. Reliability & Downtime Mitigation

### 🔄 Zero-Downtime Deployments (Blue-Green)
* **Vercel**: Vercel automatically deploys every Git push to a unique immutable preview URL. When merging to `main`, Vercel builds the project and swaps production traffic to the new build instantaneously. This provides out-of-the-box Blue-Green deployment safety.
* **Rollbacks**: If a bug is detected in production, go to Vercel dashboard → **Deployments** → Locate the previous working build → Click **Rollback**. The change is instant (takes less than 1 second) and requires no rebuilding.

### 🛡️ Third-Party API Circuit Breakers
If external APIs (MetaApi, Resend, PayPal) experience an outage:
* **Resend email alerts**: If Resend fails, we log the error but allow the user login flow to succeed (avoiding blocking the user due to email server issues).
* **MetaApi Broker Sync**: Sync failures do not block the user interface. If a sync fails, we mark `lastSyncStatus = "failed"` in Firestore and output a helpful message in the UI, allowing the user to retry manually.
* **PayPal subscriptions**: Do not grant, renew, or revoke Pro access from a browser return alone. Queue/retry reconciliation and use verified PayPal subscription and payment state when webhook delivery is delayed.

---

## 4. Scaling Optimization

### 📈 Database Sizing & Concurrency
* **Firestore Scaling**: Firestore handles scaling automatically (capable of millions of concurrent connections). To reduce database reads and cost:
  1. We cache active API keys using Vercel KV (Redis).
  2. The frontend uses a real-time snapshot listener (`onSnapshot`) which caches reads client-side, avoiding reading the database on every page view.
* **Batch Operations**: For trade synchronization, the application implements chunked database writes using `db.batch()` in blocks of 500 documents. This ensures we stay within Firestore write limitations and optimizes transactional throughput.

---

## 5. Emergency Manual Deployments

If the CI/CD pipeline fails, you can deploy the application manually using the CLIs.

### Deploy Frontend & Hono API (Vercel)
```bash
# Install Vercel CLI if not installed
npm install -g vercel

# Authenticate and link project
vercel login
vercel link

# Deploy to production
vercel --prod
```

### Deploy Cloud Functions & Rules (Firebase)
```bash
# Install Firebase CLI if not installed
npm install -g firebase-tools

# Login and deploy
firebase login
vercel --prod   # then: firebase deploy --only firestore:rules,storage
```
