import { useState } from 'react';
import { CheckCircleFill, CheckCircle } from 'react-bootstrap-icons';
import { ProTermsModal } from './ProTermsModal';
import { AppDialog } from './app/AppDialog';
import { Button } from './ui/button';
import { PRO_MONTHLY_DISPLAY, PRO_YEARLY_DISPLAY, PRO_YEARLY_MONTHLY_DISPLAY, PRO_YEARLY_SAVINGS } from '../lib/pricing';

export function PricingModal({ plan, expiry, onSubscribe, onClose, recordProAcceptance }) {
  const [showTerms, setShowTerms] = useState(false);
  const [billing, setBilling] = useState('monthly');
  const [checkoutStarting, setCheckoutStarting] = useState(false);

  const handleProClick = () => {
    setShowTerms(true);
  };

  const handleAcceptTerms = async () => {
    if (checkoutStarting) return;
    setCheckoutStarting(true);
    const accepted = await recordProAcceptance();
    if (!accepted) {
      setCheckoutStarting(false);
      return;
    }
    const started = await onSubscribe(billing === 'yearly' ? 'pro_yearly' : 'pro_monthly');
    if (started) setShowTerms(false);
    setCheckoutStarting(false);
  };

  const FREE_FEATS = [
    'Unlimited manual trades',
    'Basic P&L tracking',
    'Trade calendar',
    'Manual journal notes',
    'No Meta API or MT4/MT5 sync',
  ];

  const PRO_FEATS = [
    'Unlimited manual and synced trades',
    'MT4/MT5 Meta API sync',
    'Full analytics suite',
    'Session intelligence',
    'TradingView webhook',
    'API key access',
    'Priority support',
    'Early access to new features',
  ];

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Upgrade to Pro"
      description="Free manual journaling stays unlimited. Pro adds sync, automation, and deeper analytics."
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Free plan */}
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-[18px] items-center rounded-sm border border-border px-1.5 font-mono text-[11px] leading-none text-muted-foreground">
                Free
              </span>
              {plan === 'free' && (
                <span className="font-mono text-[11px] text-muted-foreground">Current plan</span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="figure text-2xl font-medium text-foreground">$0</span>
              <span className="font-mono text-[11px] text-muted-foreground">/ forever</span>
            </div>
            <ul className="flex flex-1 flex-col gap-2">
              {FREE_FEATS.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" disabled className="w-full">
              {plan === 'free' ? 'Current plan' : 'Free plan'}
            </Button>
          </div>

          {/* Pro plan */}
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-[18px] items-center rounded-sm border border-foreground px-1.5 font-mono text-[11px] leading-none text-foreground">
                Pro
              </span>
              {plan === 'pro' && (
                <span className="font-mono text-[11px] text-muted-foreground">Current plan</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="figure text-2xl font-medium text-foreground">
                  {billing === 'yearly' ? PRO_YEARLY_MONTHLY_DISPLAY : PRO_MONTHLY_DISPLAY}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {billing === 'yearly'
                  ? `${PRO_YEARLY_DISPLAY} billed yearly — save $${PRO_YEARLY_SAVINGS}`
                  : `${PRO_MONTHLY_DISPLAY} billed monthly`}
              </p>
              <fieldset className="grid grid-cols-2 gap-2 pt-1" aria-label="Billing cycle">
                <legend className="sr-only">Billing cycle</legend>
                {['monthly', 'yearly'].map((cycle) => (
                  <label
                    key={cycle}
                    className={`flex min-h-10 cursor-pointer items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                      billing === cycle
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="pricing-modal-billing"
                      value={cycle}
                      checked={billing === cycle}
                      onChange={() => setBilling(cycle)}
                    />
                    {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                  </label>
                ))}
              </fieldset>
              <p className="text-xs text-muted-foreground">Renews automatically through PayPal until cancelled.</p>
            </div>
            <ul className="flex flex-1 flex-col gap-2">
              {PRO_FEATS.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-xs text-foreground">
                  <CheckCircleFill className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            {plan === 'pro' ? (
              <div className="flex flex-col gap-1.5">
                <Button variant="outline" disabled className="w-full">
                  Pro active
                </Button>
                {expiry && (
                  <p className="text-center font-mono text-[11px] text-muted-foreground">
                    Next billing {new Date(expiry).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <Button className="w-full" onClick={handleProClick}>
                Upgrade to Pro
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Prices in USD · PayPal checkout only · Cancel future renewals anytime
        </p>
      </div>

      {showTerms && (
        <ProTermsModal
          onAccept={handleAcceptTerms}
          onClose={() => {
            if (!checkoutStarting) setShowTerms(false);
          }}
          busy={checkoutStarting}
          renderAcceptAction={(onAccept) => (
            <Button className="w-full" onClick={onAccept} disabled={checkoutStarting} aria-busy={checkoutStarting}>
              {checkoutStarting ? 'Opening PayPal…' : 'Accept and continue to PayPal'}
            </Button>
          )}
        />
      )}
    </AppDialog>
  );
}
