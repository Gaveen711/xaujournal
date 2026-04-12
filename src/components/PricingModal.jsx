export function PricingModal({ plan, onClose }) {
  const SUB_LIMITS = { freeTrades: 5, freeJournals: 10 };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"></div>
      
      <div 
        className="card-premium max-w-2xl w-full p-8 relative z-10 animate-in zoom-in-95 duration-300 shadow-2xl shadow-primary/10 border-primary/10" 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">✕</button>
        
        <header className="text-center space-y-2 mb-10">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Master Your Edge</span>
          <h2 className="text-3xl font-black text-gradient">Select Your Strategy</h2>
          <p className="text-sm text-muted-foreground">Unlock professional-grade analytics and unlimited logging capabilities.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className={`p-6 rounded-3xl border border-border/50 bg-muted/30 space-y-6 flex flex-col ${plan === 'free' ? 'ring-2 ring-border/50' : ''}`}>
            <div className="space-y-1">
              <h3 className="text-lg font-bold">Free Rookie</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">$0</span>
                <span className="text-xs text-muted-foreground">/ forever</span>
              </div>
            </div>
            
            <ul className="space-y-3 flex-1">
              {[
                `Up to ${SUB_LIMITS.freeTrades} trades`,
                "Basic history list",
                `${SUB_LIMITS.freeJournals} journal entries`,
                "Basic consistency calendar"
              ].map(feat => (
                <li key={feat} className="text-xs flex items-center gap-2 text-muted-foreground">
                  <span className="text-primary/50">✓</span> {feat}
                </li>
              ))}
            </ul>
            
            <button disabled className="w-full py-2.5 rounded-xl bg-border/50 text-xs font-bold text-muted-foreground cursor-default">
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="p-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background relative space-y-6 flex flex-col shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">
              Recommended
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-primary">XAU Pro Elite</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">$12</span>
                <span className="text-xs text-muted-foreground">/ month</span>
              </div>
            </div>
            
            <ul className="space-y-3 flex-1">
              {[
                "Unlimited trades & entries",
                "Advanced smart analytics",
                "High-res equity curves",
                "Unlimited screenshot storage",
                "CSV Batch export & import"
              ].map(feat => (
                <li key={feat} className="text-xs flex items-center gap-2 font-medium">
                  <span className="text-primary font-black">✓</span> {feat}
                </li>
              ))}
            </ul>
            
            <button className="btn-primary w-full py-2.5 rounded-xl text-xs font-bold shadow-primary/20">
              Pre-Order Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

