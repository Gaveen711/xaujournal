import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CRITICAL UI FAILURE:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-destructive/10 rounded-3xl mx-auto flex items-center justify-center border border-destructive/20 relative">
               <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full" />
               <svg className="w-10 h-10 text-destructive relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gradient uppercase tracking-tight">System Error</h1>
              <p className="text-[10px] text-muted-foreground font-bold leading-relaxed uppercase tracking-[0.2em]">
                The application encountered an unexpected state. Our security protocols have paused the session for your protection.
              </p>
            </div>
            
            <div className="p-4 bg-muted/20 border border-border/40 rounded-2xl">
                <p className="text-[9px] font-mono text-muted-foreground/40 tracking-tighter uppercase">
                   Reference: {this.state.error?.message?.slice(0, 40) || "Integrity Failure"}...
                </p>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Restart Terminal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
