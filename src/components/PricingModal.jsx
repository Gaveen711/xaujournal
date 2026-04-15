import { XLg, CheckCircleFill, CheckCircle } from 'react-bootstrap-icons';

export function PricingModal({ plan, expiry, onSubscribe, onClose }) {
  const SUB_LIMITS = { freeTrades: 25, freeJournals: 10 };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"></div>
      
      {/* Modal Card */}
      <div 
        className="card-premium max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-10 relative z-10 animate-in zoom-in-95 duration-300 shadow-2xl shadow-primary/10 border-primary/10 scrollbar-hide" 
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-all active:scale-75 z-20"
        >
          <XLg className="w-5 h-5" />
        </button>
        
        <header className="text-center space-y-2 mb-8 sm:mb-12">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Master Your Edge</span>
          <h2 className="text-2xl sm:text-3xl font-black text-gradient">Select Your Strategy</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed px-4">Unlock professional-grade analytics and unlimited logging capabilities.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Free Plan */}
          <div className={`p-6 sm:p-8 rounded-[2rem] border border-border/50 bg-muted/20 space-y-6 flex flex-col transition-all duration-500 ${plan === 'free' ? 'ring-2 ring-border/50 bg-muted/30' : 'hover:bg-muted/30'}`}>
            <div className="space-y-1">
              <h3 className="text-lg font-bold">Free Rookie</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">$0</span>
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">/ forever</span>
              </div>
            </div>
            
            <ul className="space-y-4 flex-1">
              {[
                `Up to ${SUB_LIMITS.freeTrades} trades`,
                "Basic history list",
                `${SUB_LIMITS.freeJournals} journal entries`,
                "Basic consistency calendar"
              ].map(feat => (
                <li key={feat} className="text-xs flex items-center gap-3 text-muted-foreground/80 font-medium">
                  <CheckCircle className="text-primary/40 w-4 h-4 flex-shrink-0" /> {feat}
                </li>
              ))}
            </ul>
            
            <button disabled className="w-full py-3.5 rounded-2xl bg-border/20 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 cursor-default border border-border/10">
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="p-6 sm:p-8 rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background relative space-y-6 flex flex-col shadow-xl shadow-primary/5 transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
              Recommended
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-primary">XAU Pro Elite</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">$9</span>
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">/ month</span>
              </div>
            </div>
            
            <ul className="space-y-4 flex-1">
              {[
                "Unlimited trades & entries",
                "Advanced smart analytics",
                "High-res equity curves",
                "CSV Batch export & import"
              ].map(feat => (
                <li key={feat} className="text-xs flex items-center gap-3 font-bold text-foreground/90">
                  <CheckCircleFill className="text-primary w-4 h-4 flex-shrink-0 shadow-sm" /> {feat}
                </li>
              ))}
            </ul>
            
            {plan === 'pro' ? (
              <div className="space-y-2">
                <button disabled className="w-full py-3.5 rounded-2xl bg-primary/10 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                  Elite Active
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
                className="btn-primary w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/10 active:scale-95 transition-all"
              >
                Upgrade to Elite
              </button>
            )}
          </div>
        </div>
        
        <p className="text-[9px] text-center text-muted-foreground/40 mt-8 uppercase tracking-widest font-black">
          Prices in USD. Cancel anytime. Secure encryption for all data.
        </p>
      </div>
    </div>
  );
}
