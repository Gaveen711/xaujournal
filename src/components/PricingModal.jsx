import { XLg, CheckCircleFill, CheckCircle } from 'react-bootstrap-icons';

export function PricingModal({ plan, expiry, onSubscribe, onClose }) {
  const SUB_LIMITS = { freeTrades: 50, freeJournals: 10 };

  const FREE_FEATS = [
    `${SUB_LIMITS.freeTrades} trades / month`,
    'Basic P&L tracking',
    'Trade calendar',
    'Manual trade entry',
    'Email support',
  ];

  const PRO_FEATS = [
    'Unlimited trades',
    'Full analytics suite',
    'Session intelligence',
    'MT5 Expert Advisor sync',
    'TradingView webhook',
    'API key access',
    'Priority support',
    'Early access to new features',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" />

      {/* Modal Card */}
      <div
        className="card-premium max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-10 relative z-10 animate-in zoom-in-95 duration-300 shadow-2xl shadow-primary/10 border-primary/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-all active:scale-75 z-20">
          <XLg className="w-5 h-5" />
        </button>

        <header className="text-center space-y-2 mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-gradient">Upgrade to Pro</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed px-4">
            Unlock unlimited trades, the full analytics suite, and automated MT5 sync.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7">
          {/* Free */}
          <div className={`p-6 sm:p-7 rounded-2xl border border-border/50 bg-muted/20 space-y-5 flex flex-col ${plan === 'free' ? 'ring-2 ring-border/50' : ''}`}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-1">Free</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">$0</span>
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">/ forever</span>
              </div>
            </div>
            <ul className="space-y-3 flex-1">
              {FREE_FEATS.map(f => (
                <li key={f} className="text-xs flex items-center gap-3 text-muted-foreground/80 font-medium">
                  <CheckCircle className="text-primary/40 w-4 h-4 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button disabled className="w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-default border border-border/30 text-muted-foreground/50">
              {plan === 'free' ? 'Current Plan' : 'Free Plan'}
            </button>
          </div>

          {/* Pro */}
          <div className="p-6 sm:p-7 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background relative space-y-5 flex flex-col shadow-xl shadow-primary/5 hover:scale-[1.01] transition-transform duration-300">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-black text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-[0.15em] shadow-lg">
              Most popular
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary mb-1">Pro</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-primary">$29.99</span>
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">/ month</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">or $199/year — <span className="text-primary font-black">save over 40%</span></p>
            </div>
            <ul className="space-y-3 flex-1">
              {PRO_FEATS.map(f => (
                <li key={f} className="text-xs flex items-center gap-3 font-bold text-foreground/90">
                  <CheckCircleFill className="text-primary w-4 h-4 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            {plan === 'pro' ? (
              <div className="space-y-2">
                <button disabled className="w-full py-3.5 rounded-xl bg-primary/10 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                  Pro Active
                </button>
                {expiry && (
                  <p className="text-[9px] text-center text-primary/60 font-black uppercase tracking-widest">
                    Renews: {new Date(expiry).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={onSubscribe}
                className="btn-primary w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/10 active:scale-95 transition-all"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>

        <p className="text-[9px] text-center text-muted-foreground/40 mt-8 uppercase tracking-widest font-black">
          Prices in USD · Cancel anytime · All data encrypted
        </p>
      </div>
    </div>
  );
}
