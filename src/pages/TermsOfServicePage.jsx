import { LegalPolicyPage } from './LegalPolicyPage';

const SEO = {
  title: 'Terms of Service | XAU Journal — XAUUSD Gold Trading Journal',
  description:
    'Read the XAU Journal terms of service. Understand your rights and responsibilities when using our XAUUSD gold trading journal platform, broker connection via Meta API, and Pro subscription.',
  keywords:
    'xaujournal terms of service, gold trading journal terms, XAUUSD journal user agreement, xau journal legal, forex trading app terms, Meta API broker connection terms, xaujournal subscription terms, gold trader app terms and conditions',
};

const SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of terms',
    content: `By creating an account or using xaujournal (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.

These Terms apply to all users, including visitors, free-tier members, and Pro subscribers. We reserve the right to update these Terms at any time. Continued use of the Service after changes are posted constitutes your acceptance of the revised Terms.`,
  },
  {
    id: 'description',
    title: '2. Description of service',
    content: `xaujournal is a cloud-based trading journal platform designed for XAUUSD (Gold) traders. It allows users to log trades, track performance analytics, write journal entries, and optionally synchronise trade data from their broker account via the Meta API broker connection.

The Service is provided on a subscription basis. A free tier with limited features is available. Advanced features are gated behind the Pro subscription plan.`,
  },
  {
    id: 'accounts',
    title: '3. Accounts & eligibility',
    content: `You must be at least 18 years old to create an account. By registering, you confirm you meet this requirement.

You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify us immediately at info@xaujournal.com if you suspect unauthorized access.

We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or abuse the platform in any way.`,
  },
  {
    id: 'subscriptions',
    title: '4. Subscriptions & billing',
    content: `Pro subscriptions are available on a monthly or yearly billing cycle at the price displayed when you subscribe. A yearly subscription is charged in full at the start of each 12-month period. All prices are shown and charged in USD. Payments and recurring billing are processed by PayPal under PayPal's applicable terms.

Your Pro subscription renews automatically each month or year, depending on the plan you choose, until you cancel it. You authorise PayPal to charge your selected payment method for each renewal. You may cancel before the next billing date through the available subscription-management flow. Cancellation stops future renewals; it does not automatically refund a completed payment. Pro access continues through the end of the period already paid for, unless a payment is reversed, refunded, disputed, or otherwise invalidated.

Subscription payments are generally non-refundable except where required by law. If you believe you were charged more than once or charged incorrectly, contact info@xaujournal.com. We may review a refund request, but review does not guarantee a refund. See the Payment & Cancellation Policy at www.xaujournal.com/refund-policy for details.`,
  },
  {
    id: 'acceptable-use',
    title: '5. Acceptable use',
    content: `You agree not to use xaujournal to:

• Engage in any unlawful activity or violate any applicable law or regulation.
• Attempt to reverse-engineer, decompile, or extract source code from the platform.
• Overload, disrupt, or attack our servers or infrastructure.
• Scrape, harvest, or systematically collect data from the Service using automated means.
• Resell, sublicense, or distribute access to the Service to third parties.
• Impersonate any other person or entity.

Violation of this section may result in immediate account termination without refund.`,
  },
  {
    id: 'data-ownership',
    title: '6. Your data & content',
    content: `All trade data, journal entries, and notes you enter into xaujournal remain your property. You grant us a limited, non-exclusive license to store and process this data solely to provide the Service to you.

We will never sell your data to third parties. We do not use your trading data for advertising purposes. See our Privacy Policy at www.xaujournal.com/privacy for full details on how we handle your information.

You may export or delete your data at any time from within the platform.`,
  },
  {
    id: 'meta-api',
    title: '7. Meta API & broker connection',
    content: `xaujournal supports optional trade synchronisation via the Meta API — the industry-standard protocol used by MetaTrader 4 (MT4) and MetaTrader 5 (MT5) compatible brokers. By connecting your broker account through this feature, you authorise xaujournal to establish a read-only connection to your broker's trade history using a secure token issued through the Meta API protocol.

The Meta API connection is provided for personal use only. You may not share, transfer, or use another person's broker credentials to connect to xaujournal.

You are responsible for keeping your xaujournal account secure and for any activity resulting from your broker connection. We are not liable for any trading losses, broker actions, account restrictions, or data exposure resulting from your use of the Meta API connection or the misuse of your account credentials.

The Meta API connection feature is provided as-is. We make no warranty that it will be compatible with all brokers, MT4/MT5 server versions, or broker configurations. You may revoke the broker connection at any time from your account settings, which will immediately terminate our access to your broker data.

xaujournal is not affiliated with, endorsed by, or responsible for MetaQuotes Software Corp., any MetaTrader platform, or any broker you choose to connect.`,
  },
  {
    id: 'disclaimers',
    title: '8. Disclaimers & no financial advice',
    content: `xaujournal is a journaling and analytics tool. Nothing on the platform constitutes financial advice, investment advice, or a recommendation to buy or sell any financial instrument.

Trading in financial markets, including Gold (XAUUSD), involves substantial risk of loss. Past performance data shown in the app is for informational purposes only and is not indicative of future results. You are solely responsible for your own trading decisions.

THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.`,
  },
  {
    id: 'liability',
    title: '9. Limitation of liability',
    content: `To the maximum extent permitted by applicable law, xaujournal and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of profits, data, or goodwill — arising out of your use of or inability to use the Service.

Our total liability to you for any claim arising from these Terms or your use of the Service shall not exceed the total amount you paid us in the 12 months preceding the claim.`,
  },
  {
    id: 'termination',
    title: '10. Termination',
    content: `You may stop using the Service and delete your account at any time by contacting info@xaujournal.com. We will process account deletion requests within 30 days.

We may terminate or suspend your account at any time, with or without notice, for violation of these Terms or any other reason we deem necessary to protect the integrity of the platform. Upon termination, your right to use the Service ceases immediately.`,
  },
  {
    id: 'governing-law',
    title: '11. Governing law',
    content: `These Terms are governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or your use of the Service shall first be attempted to be resolved through good-faith negotiation.

If you have a dispute or complaint, please contact us first at info@xaujournal.com. We aim to resolve all issues within 5 business days.`,
  },
  {
    id: 'contact',
    title: '12. Contact',
    content: `For any questions regarding these Terms:\n\nEmail: info@xaujournal.com\n\nWe aim to respond within two business days.`,
  },
];

export function TermsOfServicePage() {
  return (
    <LegalPolicyPage
      seo={SEO}
      code="TOS"
      eyebrow="Policy register / service terms"
      title="Terms of"
      accent="Service"
      lede="Our commitment to transparency and fairness in providing the best trading journal experience."
      summary="Use xaujournal responsibly. Your data is yours. We don't give financial advice. Connect your broker securely via Meta API. Pro subscriptions are billed in USD through PayPal and renew automatically each month or year until cancelled."
      sections={SECTIONS}
    />
  );
}
