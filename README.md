# xaujournal — Pro Trade Intelligence Terminal

A high-performance, premium trading journal designed for XAU/USD (Gold) and Forex market participants. Built with a sleek, dark terminal aesthetic and professional-grade security.

## 🚀 Project Scope

The xaujournal project aims to provide traders with a frictionless, insight-driven environment to log operations and refine their market strategies. The project scope encompasses:

### 1. Performance Terminal (The Execution Engine)
*   **Precision Logging**: Real-time trade entry with automated P&L calculation based on market-specific pips and lot sizes.
*   **Equity Curve Intelligence**: Dynamic charting of account growth with 30-day and full-history snapshots.
*   **Operational Stats**: Automated calculation of Win Rates, Average Growth, and Drawdown.

### 2. Cognitive Briefs (Journals)
*   **Psychology Tracking**: A professional journal system to document the "why" behind every execution.
*   **Historical Archive**: A searchable, date-indexed repository of past market observations.

### 3. Tiered Ecosystem (Subscription Logic)
*   **Free Tier**: Limited to 25 lifetime trades and 10 intelligence briefs. Features a hard lockout screen upon reaching operational limits.
*   **Pro Tier**: Unlimited operations, full data export/import capabilities, and professional customer portal via Stripe.
*   **Secure Billing**: Fully integrated Stripe Checkout and billing management with automated expiry reminders.

### 4. Hardened Security Infrastructure
*   **Identity Shield**: Firebase Authentication with mandatory ID Token verification across all backend endpoints.
*   **Data Integrity**: Strict Firestore schema validation and document size limits to prevent database abuse.
*   **Network Guard**: Tightened Content Security Policy (CSP) and origin whitelisting to prevent open redirects and injection attacks.

## 🛠️ Tech Stack
*   **Frontend**: React (Vite), TailwindCSS-inspired Premium CSS, Chart.js.
*   **Backend**: Node.js ESM Serverless Functions (Vercel).
*   **Database & Auth**: Firebase Firestore & Auth.
*   **Payments**: Stripe API.
*   **Emails**: Resend.

## ⚖️ Compliance
Includes a fully integrated **Privacy Protocol** documenting AES-256 encryption standards and Stripe PCI-compliant processing.

---
© 2026 xaujournal. Curated By Gaveen Perera
