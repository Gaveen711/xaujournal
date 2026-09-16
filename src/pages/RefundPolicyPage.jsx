import { LegalPolicyPage } from './LegalPolicyPage';

const SEO = {
  title: 'Payment & Cancellation Policy | XAU Journal',
  description: 'PayPal subscription billing, cancellation, and refund policy for XAU Journal Pro.',
  keywords: 'xaujournal payment policy, PayPal subscription cancellation, xaujournal Pro billing',
};

const SECTIONS = [
  {
    id: 'overview',
    title: '1. Payment overview',
    content: `xaujournal Pro is offered as a monthly or yearly subscription. Prices are displayed and charged in USD. PayPal processes the subscription payment and presents the payment methods available for your account and location.

Review the plan, price, billing frequency, and next billing date before approving the subscription in PayPal.`,
  },
  {
    id: 'renewal',
    title: '2. Automatic renewal',
    content: `Your subscription renews automatically every month or year, according to the plan you select, until you cancel it. By approving the subscription, you authorise PayPal to charge your selected payment method for each renewal at the then-applicable subscription price.

If a renewal payment fails, Pro access may be limited or suspended in accordance with the subscription status reported by PayPal.`,
  },
  {
    id: 'cancellation',
    title: '3. Cancellation',
    content: `You may cancel your subscription before the next billing date through the available subscription-management flow. Cancellation stops future renewals but does not automatically refund a completed payment.

After cancellation, Pro access continues through the end of the period already paid for. At the end of that period, the account returns to the free tier unless another active Pro subscription exists.`,
  },
  {
    id: 'refunds',
    title: '4. Refunds',
    content: `Subscription payments are generally non-refundable after they are completed, except where a refund is required by applicable law. Cancelling a subscription does not create a refund for the current paid period.

If you believe a payment was duplicated or charged incorrectly, contact info@xaujournal.com promptly with your account email, PayPal transaction or subscription reference, charge date, and amount. We may review a refund request, but review does not guarantee that a refund will be approved.`,
  },
  {
    id: 'processing',
    title: '5. Payment processing',
    content: `Payments and recurring billing are processed by PayPal and are also subject to PayPal's applicable user agreements, privacy practices, and dispute procedures. xaujournal does not store your PayPal password or complete payment-card credentials.

A refund, reversal, chargeback, or successful payment dispute may end the Pro access associated with that payment.`,
  },
  {
    id: 'support',
    title: '6. Support',
    content: `For billing questions, email info@xaujournal.com with your registered account email, PayPal transaction or subscription reference, charge date, and amount. Never send your PayPal password, one-time security code, or complete payment-card details.`,
  },
];

export function RefundPolicyPage() {
  return (
    <LegalPolicyPage
      seo={SEO}
      code="PAY"
      eyebrow="Policy register / subscription billing"
      title="Payment &"
      accent="Cancellation"
      lede="Know when PayPal bills you, how renewal works, and what happens after cancellation."
      summary="Pro is billed in USD through PayPal and renews automatically each month or year until cancelled. Cancellation stops future renewals, while access continues through the period already paid for."
      sections={SECTIONS}
    />
  );
}
