import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ConsentModal({ onAgree }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-xl animate-in fade-in duration-700" />
      
      {/* Modal content */}
      <div className="relative w-full max-w-lg card-premium p-8 sm:p-12 space-y-8 animate-in zoom-in-95 slide-in-from-bottom-8 duration-700 flex flex-col items-center text-center shadow-[0_0_100px_rgba(139,92,246,0.1)]">
        
        <div className="w-20 h-20 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner relative group">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/30 transition-all duration-700" />
          <ShieldCheck className="w-10 h-10 text-primary relative z-10 animate-pulse" />
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-black text-gradient uppercase tracking-tight">Access Protocol</h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] leading-relaxed">
            By entering the XAU Journal terminal, you acknowledge our data synchronization protocols.
          </p>
        </div>

        <div className="w-full space-y-4 pt-4">
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-[10px] space-y-3 text-left leading-relaxed">
            <p className="font-bold text-foreground/80 uppercase tracking-widest text-[9px]">The Intelligence Agreement:</p>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground">
              <li>You agree to our <button onClick={() => navigate('/privacy')} className="text-primary hover:underline font-black uppercase">Privacy & Policy</button>.</li>
              <li>You consent to secure synchronized data storage via Firebase.</li>
              <li>You accept automated MT5 signal transmission if EA is activated.</li>
            </ul>
          </div>
          
          <button 
            onClick={onAgree}
            className="w-full btn-primary h-14 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest group shadow-2xl active:scale-95 transition-all"
          >
            I Agree & Initialize Terminal
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">Authorized Synchronization Required for Entry | XAU v1.0</p>
        </div>

      </div>
    </div>
  );
}
