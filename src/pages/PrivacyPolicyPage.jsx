import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Lenis from 'lenis';

const SECTIONS = [
  {
    id: 'data-collection',
    title: '1. What data we collect',
    content: `We collect only what is necessary to operate Gold Journal:

• Account data — your email address, display name, and authentication provider (email/password or Google OAuth) via Firebase Authentication.

• Trade data — entry/exit prices, lot size, direction, duration, P&L, and any notes you attach. This is sent by you manually or by the MT5 Expert Advisor under your explicit control.

• Usage telemetry — basic interaction signals (feature usage frequency, session counts) used solely to enforce plan limits and improve the product. We never track keystrokes or screen content.

• Billing data — your subscription status and Stripe customer ID. We do not store or process card numbers; all payment data is handled by Stripe.`,
  },
  {
    id: 'data-security',
    title: '2. How we protect your data',
    content: `All data in transit is encrypted via TLS 1.3. Data at rest is stored in Google Firebase (Firestore), protected by Firestore Security Rules that enforce strict user-level isolation — no user can access another user's data, and neither can we in normal operation.

Your trade data is scoped under the path users/{uid}/trades, meaning only a valid Firebase Auth token for your account grants read/write access. API keys for MT5 sync are stored in a separate Firestore collection, hashed, and can be rotated or revoked at any time from your account settings.`,
  },
  {
    id: 'mt5-sync',
    title: '3. MT5 Expert Advisor & API sync',
    content: `Our MQL5 Expert Advisor (EA) transmits trade data from your MetaTrader 5 terminal to our Vercel serverless API endpoint using your unique API key. The EA sends: position ID, symbol, direction, lot size, open/close prices, open/close times, and broker-reported P&L.

We do not receive your MT5 account credentials, account balance beyond individual trade P&L, open positions, or any other account metadata. The EA only runs when the MT5 terminal is active on your Windows desktop — it has no persistent access to your broker account.

You can revoke sync access at any time by rotating your API key or removing the EA from your chart.`,
  },
  {
    id: 'payments',
    title: '4. Payments & subscriptions',
    content: `All financial transactions are processed by Stripe. Gold Journal does not store credit card numbers, CVVs, or bank details on our servers. When you upgrade to Pro, we create a Stripe Customer and Subscription linked to your Firebase UID.

Subscription status (active, cancelled, past due) is synced from Stripe webhooks to Firestore and used to gate Pro features. You can manage or cancel your subscription at any time via the billing portal accessible from your account settings.`,
  },
  {
    id: 'data-sharing',
    title: '5. Data sharing & third parties',
    content: `We do not sell, rent, or share your personal or trading data with any third party for advertising or commercial purposes. The only third-party services that process your data are:

• Google Firebase — authentication and database storage.
• Stripe — payment processing and subscription management.
• Vercel — serverless function hosting for the sync API.

Each of these services maintains its own privacy and security certifications (SOC 2, ISO 27001). Links to their privacy policies are available on their respective websites.`,
  },
  {
    id: 'user-rights',
    title: '6. Your rights & data control',
    content: `You retain full ownership of your data. You can:

• Export — download a CSV of all trade records from the History page at any time.
• Delete entries — permanently remove individual trades from the History page.
• Reset account — use the "Reset Terminal" function in account settings to wipe all trade and journal data.
• Delete account — contact us at support@xaujournal.com to permanently delete your account. All associated data will be purged from Firestore within 30 days.

If you are located in the European Economic Area (EEA), you have additional rights under the GDPR including the right to access, rectify, port, and erase your data. Contact us to exercise any of these rights.`,
  },
  {
    id: 'cookies',
    title: '7. Cookies & local storage',
    content: `Gold Journal uses minimal browser storage:

• localStorage — stores your onboarding state, starting balance, and theme preference. This data never leaves your device.
• Firebase Auth SDK — stores an authentication token in IndexedDB to keep you logged in between sessions. This is essential for the app to function.

We do not use advertising cookies, tracking pixels, or third-party analytics scripts.`,
  },
  {
    id: 'changes',
    title: '8. Changes to this policy',
    content: `We may update this policy as the product evolves. Material changes will be communicated via the in-app notification system and by email to your registered address at least 14 days before they take effect. Continued use of Gold Journal after that date constitutes acceptance of the revised policy.`,
  },
  {
    id: 'contact',
    title: '9. Contact',
    content: `For any privacy-related questions or requests:\n\nEmail: support@xaujournal.com\n\nWe aim to respond within two business days.`,
  },
];

export function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const navRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScroll(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    window.scrollTo(0, 0);

    return () => lenis.destroy();
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 20) {
        nav.classList.add('bg-background/80', 'backdrop-blur-xl', 'border-b', 'border-border/50');
        nav.classList.remove('bg-transparent', 'border-transparent');
      } else {
        nav.classList.remove('bg-background/80', 'backdrop-blur-xl', 'border-b', 'border-border/50');
        nav.classList.add('bg-transparent', 'border-transparent');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20 font-sans">
      
      {/* ── Ambient blobs ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-[100px] opacity-60 mix-blend-screen" />
      </div>

      {/* ── Nav ───────────────────────────────────────────────── */}
      <header>
        <nav ref={navRef} className="fixed top-0 left-0 right-0 z-[100] h-16 flex items-center justify-between px-6 transition-all duration-500 ease-out border-b border-transparent bg-transparent">
          <button onClick={() => { navigate('/'); window.scrollTo(0,0); }} aria-label="Go home" className="flex items-center gap-2 hover:opacity-80 transition-opacity z-50">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-to flex items-center justify-center text-[0.65rem] font-black text-white shadow-lg shadow-primary/20">XAU</span>
            <span className="text-lg font-bold tracking-tight">Journal</span>
          </button>

          <ul className="hidden md:flex items-center gap-1">
            {[{to:'/',l:'Home'},{to:'/pricing',l:'Pricing'},{to:'/contact',l:'Contact'}].map(({to,l})=>(
              <li key={to}>
                <NavLink to={to} className="text-sm font-medium px-4 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                  {l}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 z-50">
            <button onClick={()=>navigate('/login')} className="hidden md:block glass text-foreground text-sm font-bold tracking-wide px-5 py-2.5 rounded-full shadow-lg hover:bg-foreground/10 hover:-translate-y-0.5 transition-all duration-300">
              Get started
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-foreground">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 {mobileMenuOpen ? <path d="M18 6L6 18M6 6l12 12"/> : <path d="M4 6h16M4 12h16M4 18h16"/>}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          <div className={`md:hidden fixed inset-0 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex flex-col items-center justify-center h-full gap-8">
              {[{to:'/',l:'Home'},{to:'/pricing',l:'Pricing'},{to:'/contact',l:'Contact'}].map(({to,l})=>(
                <NavLink key={to} to={to} onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black tracking-tight text-foreground hover:text-primary transition-colors">
                  {l}
                </NavLink>
              ))}
              <button onClick={()=>navigate('/login')} className="mt-8 glass text-foreground text-lg font-bold tracking-wide px-8 py-4 rounded-full shadow-lg hover:bg-foreground/10 hover:-translate-y-0.5 transition-all duration-300">
                Get started
              </button>
            </div>
          </div>
        </nav>
      </header>

      <main className="relative z-10 px-6 pt-32 pb-32">
        {/* Hero */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="text-center max-w-2xl mx-auto mb-20">
          <motion.p variants={itemVariants} className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">Legal</motion.p>
          <motion.h1 variants={itemVariants} className="text-[clamp(2.5rem,6vw,4rem)] font-black leading-[1.05] tracking-tight mb-6">
            Privacy Policy
          </motion.h1>
          <motion.p variants={itemVariants} className="text-lg text-muted-foreground font-medium leading-relaxed mb-2">
            We believe privacy policies should be readable. This one is.
          </motion.p>
          <motion.p variants={itemVariants} className="text-sm text-muted-foreground/70 font-medium">
            Effective date: April 15, 2026 · Last updated: April 15, 2026
          </motion.p>
        </motion.div>

        {/* Two-column layout: TOC + content */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12 lg:gap-20 items-start">
          
          {/* Table of contents — sticky sidebar */}
          <nav aria-label="Table of contents" className="hidden lg:block sticky top-28">
            <p className="text-primary text-xs font-bold tracking-[0.15em] uppercase mb-6">Contents</p>
            <ul className="flex flex-col gap-3">
              {SECTIONS.map((s, i) => (
                <motion.li key={s.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + (i*0.05) }}>
                  <a href={`#${s.id}`} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors block leading-snug">
                    {s.title.replace(/^\\d+\\.\\s/, '')}
                  </a>
                </motion.li>
              ))}
            </ul>
          </nav>

          {/* Policy content */}
          <motion.article initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
            <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm mb-12 shadow-inner">
              <p className="text-sm md:text-base leading-relaxed font-medium text-foreground">
                <strong className="text-primary mr-2 font-bold">Summary:</strong> 
                We only collect what's needed to run the app. Your trading data belongs to you. We don't sell it. You can delete everything at any time.
              </p>
            </div>

            <div className="flex flex-col gap-16">
              {SECTIONS.map(s => (
                <section key={s.id} id={s.id} className="scroll-mt-28">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-1 h-8 bg-gradient-to-b from-primary to-primary-to rounded-full shrink-0 shadow-sm shadow-primary/30" />
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{s.title}</h2>
                  </div>
                  <div className="pl-5 md:pl-8">
                    {s.content.split('\\n\\n').map((block, i) => (
                      <p key={i} className="text-base text-muted-foreground leading-relaxed font-medium mb-4 whitespace-pre-line">
                        {block}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </motion.article>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-border/50 py-12 px-6 bg-muted/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-to flex items-center justify-center text-[0.6rem] font-black text-white shadow-md">XAU</span>
            <span className="text-lg font-bold tracking-tight">Journal</span>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2 text-xs font-medium text-muted-foreground/60">
            <div className="flex items-center gap-3">
              <span>© {new Date().getFullYear()} XAU Journal</span>
              <span className="w-1 h-1 rounded-full bg-border/40" />
              <NavLink to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</NavLink>
            </div>
            <span>Crafted with precision</span>
          </div>
        </div>
      </footer>
      {/* Scroll to Top */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
        className={`fixed bottom-8 right-8 z-[90] p-3 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-primary shadow-lg shadow-primary/10 transition-all duration-500 hover:-translate-y-1 hover:bg-primary/30 ${showScroll ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
      </button>
    </div>
  );
}