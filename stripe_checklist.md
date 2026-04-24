# Stripe Checkout Flow: Manual Testing Checklist

Due to webhooks and asynchronous state changes, the Stripe checkout flow is vulnerable to silent failures. Run through this checklist before any major release or pricing change.

## 1. Pre-Checkout State
- [ ] **UI Alignment:** Verify the Pricing Page shows $29.99/mo and $199/yr.
- [ ] **Modal Trigger:** Click "Upgrade to Pro" from the dashboard. Ensure the `PricingModal` appears correctly.
- [ ] **Plan Selection:** Click the upgrade button inside the modal and confirm it redirects to the Stripe Checkout page.

## 2. Stripe Checkout Page
- [ ] **Product Matching:** Verify the product name shown on the Stripe checkout matches "Pro Subscription".
- [ ] **Price Matching:** Verify the amount matches the selected plan ($29.99 or $199.00).
- [ ] **Email Pre-fill:** Ensure the user's email address is automatically pre-filled in the checkout form (passed via `customer_email`).

## 3. Successful Payment & Redirect
- [ ] **Test Card:** Complete the purchase using a Stripe test card (e.g., `4242 4242 4242 4242`).
- [ ] **Success URL:** Verify the redirect lands correctly on `/app/checkout-success` (not a 404).
- [ ] **Loading State:** Ensure the success page shows a loading/syncing state while waiting for the webhook to update Firestore.
- [ ] **Final Redirection:** Ensure the success page redirects to the `/app` dashboard after the sync completes.

## 4. Post-Checkout State (Firestore & UI Sync)
- [ ] **Firestore Document:** Open the Firebase Console and verify the user's document has:
  - `plan` set to `"pro"`
  - `stripeCustomerId` populated
  - `planExpiry` updated to 1 month or 1 year in the future.
- [ ] **UI Update:** Verify the dashboard UI reflects the Pro status immediately without requiring a hard refresh (thanks to `onSnapshot`).
- [ ] **Feature Unlocking:** Verify that Pro features (e.g., MT5 sync setup, unlimited logs, export to CSV) are now unlocked.

## 5. Cancellation & Grace Period Flow
- [ ] **Portal Access:** Click "Manage Billing" in the app and verify it opens the Stripe Customer Portal.
- [ ] **Cancel Plan:** Cancel the subscription via the portal.
- [ ] **Grace Period UI:** Return to the app. Verify the UI still shows "Pro Active" but displays the correct "Renews/Expires" date.
- [ ] **Expired State:** (Optional/Emulator) Fast-forward the date or manually change `planExpiry` in Firestore to a past date. Verify the app correctly downgrades to "Free" upon the next session check, taking the 4-day grace period into account.

## Common Silent Failures to Watch For
* **Webhook Mismatch:** The webhook secret in Vercel doesn't match the Stripe dashboard, causing payments to process but Firestore to never update.
* **Price ID Mismatch:** The frontend requests a `planType` that isn't handled correctly in `api/checkout.js`, defaulting to the wrong price or failing.
* **Cross-Origin Errors:** The API route fails because `origin` isn't whitelisted or `ALLOWED_ORIGIN` env var is missing in production.
