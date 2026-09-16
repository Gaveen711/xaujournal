# Secrets and environment configuration

All server secrets live in Vercel environment variables. Nothing in this list
belongs in git, and nothing here may carry a `VITE_` prefix unless it is
genuinely public — Vite inlines every `VITE_*` variable into the client bundle.

`api/_security.ts#assertRequiredConfig` logs any missing entry at cold start, so
check the function logs after a deploy or a rotation.

## Required

| Variable | Used by | Effect if missing |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | all Firestore access | API cannot reach the database |
| `CRON_SECRET` | `/api/cron/*` | **Cron routes refuse to run (503).** Must be ≥32 characters |
| `PAYPAL_CLIENT_ID` | PayPal REST app identification | PayPal checkout cannot initialize |
| `PAYPAL_CLIENT_SECRET` | PayPal OAuth and subscription API | Server-to-server PayPal requests refuse to run |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook verification | Subscription events cannot be trusted or applied |
| `PAYPAL_ENV` | PayPal API selection (`sandbox` or `live`) | PayPal integration refuses to start |
| `PAYPAL_MONTHLY_PLAN_ID` | monthly Pro checkout | Monthly subscription creation is disabled |
| `PAYPAL_YEARLY_PLAN_ID` | yearly Pro checkout | Yearly subscription creation is disabled |
| `METAAPI_TOKEN` | broker sync | Broker connect and sync fail |
| `RESEND_API_KEY` | transactional mail | Mail silently fails (errors are logged) |

## Recommended

| Variable | Used by | Effect if missing |
|---|---|---|
| `RECAPTCHA_API_KEY` | `/api/contact` | Bot protection is not enforced; a warning is logged per request |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA assessment | As above. Public value — safe to expose |
| `REQUIRE_EMAIL_VERIFICATION` | `api/_auth.ts` | Enforcement of verified email on broker and API-key routes. **On by default** and safe to leave on: only accounts created after this shipped are gated (they carry a server-set `requiresEmailVerification` flag set by `/init-user`), so accounts that predate verification are grandfathered and never locked out mid-subscription. Google sign-ins are always verified. Set to the string `false` to disable entirely |
| `ALLOWED_ORIGIN` | CORS | Extra allowed origin. `localhost:5173` is added automatically outside production |

## Public (`VITE_*`, inlined into the client bundle)

`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`,
`VITE_GA_MEASUREMENT_ID`.

Firebase web config values are public by design — access control is enforced by
`firestore.rules` and `storage.rules`, not by hiding the API key.

The PayPal client ID, webhook ID, and plan IDs are identifiers rather than
passwords, but this application keeps them in server configuration so Sandbox
and Live resources cannot be mixed accidentally. `PAYPAL_CLIENT_SECRET` must
never be exposed to the browser. Each plan ID must belong to the REST app and
environment selected by `PAYPAL_ENV`.

## Rotation

```bash
# Set or rotate a value, then redeploy so functions pick it up.
vercel env rm CRON_SECRET production
vercel env add CRON_SECRET production
vercel --prod
```

Generate a strong `CRON_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

After rotating `METAAPI_TOKEN`, revoke the old one at
[MetaApi → API access](https://app.metaapi.cloud/api-access/generate-token).

## Local development

`.env.local` at the repo root is gitignored and holds the same names. Pull the
current values rather than keeping a long-lived copy on disk:

```bash
vercel env pull .env.local
```

The workstation holding this file has a full Firebase service-account private
key on it — make sure it has full-disk encryption.

## Console-side configuration

Not everything is an environment variable. These are set in the Firebase
console and are part of the security posture:

- **App Check** with reCAPTCHA Enterprise, enforced on Authentication,
  Firestore, and Storage. This is the only control that covers the direct
  browser-to-Google auth path, which the Vercel rate limiter never sees.
- **Email enumeration protection** and a password policy (minimum 12
  characters) under Authentication → Settings.
- **Multi-factor authentication** for any account holding the `admin` custom
  claim, and for Pro accounts.
- **TTL policy** on the `webhookEvents` collection (90 days) so the replay
  ledger does not grow without bound.

## Admin access

Admin is a custom claim, not a hardcoded UID:

```bash
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./service-account.json')) });
admin.auth().setCustomUserClaims('<uid>', { admin: true }).then(() => console.log('done'));
"
```

The claim takes effect on the user's next token refresh. Revoke by setting
`{ admin: false }`. Enforce MFA on every account that holds it.

## Broker credentials

Broker MT4/MT5 passwords are never stored server-side, and are never written to
`localStorage`. See `src/lib/brokerCredentials.js` for the storage split and the
reasoning.
