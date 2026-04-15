import { useState, useEffect } from 'react';
import { ArrowLeft } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-700">
      <div className="max-w-3xl mx-auto space-y-12">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-gradient uppercase tracking-tight">Privacy & Policy</h1>
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Effective Date: April 14, 2026</p>
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border/40 text-[10px] font-black uppercase tracking-widest hover:bg-muted/80 transition-all active:scale-95"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Terminal
          </button>
        </div>

        {/* CONTENT */}
        <div className="card-premium p-8 sm:p-12 space-y-10 leading-relaxed text-foreground/80 font-medium whitespace-pre-wrap">
          
          <section className="space-y-4">
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              1. Data Transmission & Security
            </h2>
            <p>
              XAU Journal operates on a hardened architecture. All performance logs, journal entries, and account metadata are synchronized using industry-standard AES-256 encryption via Google Firebase. Your data is stored in secure cloud environments with strict row-level security protocols, ensuring that only you possess the authorization to view or modify your trading intelligence.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              2. Payment & Subscription Intelligence
            </h2>
            <p>
              All financial transactions and Pro subscriptions are handled exclusively by Stripe. XAU Journal does not store or process your credit card numbers or sensitive billing data on its own servers. Stripe's world-class security infrastructure ensures your payment signals remain encrypted and isolated from the main terminal.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              3. Terminal Interaction Data
            </h2>
            <p>
              We collect minimal telemetry to ensure the stability of the terminal. This includes basic usage statistics (such as trade counts and login frequency) required to enforce subscription limits and prevent unauthorized access. We do not sell, trade, or share your proprietary trading strategies or notes with third-party entities.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              4. User Control & Data Deletion
            </h2>
            <p>
              Pro users maintain absolute control over their operational data through the "Reset Terminal" function. Manual deletion of trade logs or journal entries permanently scrubs the data from our real-time database. If you choose to delete your account entirely, all associated metadata and performance logs will be purged from our primary systems.
            </p>
          </section>

          <section className="space-y-4 pt-6 border-t border-border/10">
            <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">
              By utilizing the XAU Journal terminal, you acknowledge and agree to these privacy protocols. For further inquiries regarding your data security, consult the official Firebase and Stripe documentation.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
}
