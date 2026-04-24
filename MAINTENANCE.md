# 🛡️ Maintenance & Security Post-Deployment Checklist

This document outlines critical manual steps to ensure the long-term security and financial safety of the **xaujournal** platform.

---

## 1. 🚨 Usage & Spend Alerts (CRITICAL)
Before scaling to real users, you MUST set up budget alerts to prevent unexpected costs from spikes in traffic or potential DDoS.

### Vercel Spend Alerts
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Select **Settings** → **Billing**.
3. Under **Spend Management**, set a budget (e.g., $10/month).
4. Enable **Email Notifications** when spending reaches 50%, 75%, and 100%.

### Firebase Usage Alerts
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select **Usage and Billing** → **Details & Settings**.
3. Click on **Advisory alerts**.
4. Set thresholds for **Cloud Firestore Read/Write** operations and **Authentication** logins.

---

## 2. 🔑 API Key Rotation Plan
If you ever committed secrets (like Stripe Private Keys or Firebase Service Accounts) to Git history, they are considered compromised.

### Steps to Rotate:
1. **Stripe**:
   - Go to Stripe Dashboard → **Developers** → **API Keys**.
   - Click **Roll Key** for your Secret Key (`sk_live_...`).
   - Immediately update the `STRIPE_SECRET` environment variable in Vercel.
2. **Firebase Service Account**:
   - Go to Google Cloud Console → **IAM & Admin** → **Service Accounts**.
   - Select the Firebase Admin SDK account.
   - Go to **Keys** → **Add Key** → **Create new key (JSON)**.
   - Delete the old key.
   - Update the `FIREBASE_SERVICE_ACCOUNT` base64 string in Vercel.
3. **Resend**:
   - Go to Resend Dashboard → **API Keys**.
   - Delete the existing key and create a new one.
   - Update `RESEND_API_KEY` in Vercel.

---

## 3. 🧹 Git History Scrubbing
If a secret was committed in the past, rotating it is the primary defense. However, to completely remove it from your repository's history:
1. Use **[BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)** or **`git-filter-repo`** to scrub the sensitive string from all commits.
2. Force push the clean history to GitHub.
3. **Enable GitHub Secret Scanning**: Go to **Settings** → **Code security and analysis** and ensure "Secret scanning" is enabled.

---

## 4. 🧪 Production Monitoring
- **Vercel Logs**: Check `api/` route logs daily for `401 Unauthorized` or `500 Internal Server Error` spikes.
- **Firestore Monitoring**: Check the **Usage** tab in Firebase to ensure document writes are within expected bounds.

---

> [!IMPORTANT]
> **Never commit your `.env` file.** Ensure it remains in your `.gitignore`.
