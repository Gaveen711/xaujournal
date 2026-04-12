export function OnboardingModal({ onClose, onComplete }) {
  const complete = () => {
    const val = parseFloat(document.getElementById('onboard-wallet')?.value || 0);
    onComplete(val);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md animate-in fade-in duration-500"></div>
      
      <div 
        className="card-premium max-w-md w-full p-10 relative z-10 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 shadow-2xl border-primary/10"
      >
        <header className="text-center space-y-3 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-400 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-primary/20 rotate-3">
            XAU
          </div>
          <h2 className="text-2xl font-black text-gradient pt-2">Initialize Your Journal</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Welcome to XAU. Let's set a baseline for your equity curve calculation.
          </p>
        </header>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Starting Portfolio Balance</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
              <input 
                id="onboard-wallet" 
                type="number" 
                placeholder="0.00" 
                autoFocus 
                className="input-premium pl-8 text-lg font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              className="btn-secondary h-11 text-xs font-bold" 
              onClick={onClose}
            >
              Skip Setup
            </button>
            <button 
              className="btn-primary h-11 text-xs font-bold" 
              onClick={complete}
            >
              Start Journaling
            </button>
          </div>
        </div>
        
        <p className="text-[10px] text-center text-muted-foreground mt-8 uppercase tracking-widest font-medium opacity-50">
          You can change this anytime in settings
        </p>
      </div>
    </div>
  );
}

