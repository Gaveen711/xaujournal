import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Lenis from 'lenis';
import { useAppTheme } from '../hooks/useAppTheme';
import { MoonStarsFill, SunFill } from 'react-bootstrap-icons';

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
    content: `xaujournal is a cloud-based trading journal platform designed for XAUUSD (Gold) traders. It allows users to log trades, track performance analytics, write journal entries, and optionally synchronize trade data from MetaTrader 5 via a dedicated Expert Advisor (EA).

The Service is provided on a subscription basis. A free tier with limited features is available. Advanced features are gated behind the Pro subscription plan.`,
  },
  {
    id: 'accounts',
    title: '3. Accounts & eligibility',
    content: `You must be at least 18 years old to create an account. By registering, you confirm you meet this requirement.

You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify us immediately at support@xaujournal.com if you suspect unauthorized access.

We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or abuse the platform in any way.`,
  },
  {
    id: 'subscriptions',
    title: '4. Subscriptions & billing',
    content: `Pro subscriptions are billed monthly at the rate displayed at the time of purchase. All prices are in USD. Payments are processed securely by Stripe.

Subscriptions auto-renew each billing cycle unless cancelled before the renewal date. You may cancel at any time via the billing portal in your account settings. Cancellation takes effect at the end of the current billing period — you retain Pro access until then.

We do not offer refunds for partial months or unused features. If you believe a charge is in error, contact us within 14 days at support@xaujournal.com.`,
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

We will never sell your data to third parties. We do not use your trading data for advertising purposes. See our Privacy Policy at xaujournal.vercel.app/privacy for full details on how we handle your information.

You may export or delete your data at any time from within the platform.`,
  },
  {
    id: 'mt5-ea',
    title: '7. MT5 Expert Advisor',
    content: `The MT5 Expert Advisor (EA) provided as part of xaujournal is for personal use only. You may not distribute, sell, or share the EA file or its source code with others.

The EA connects to our API using a unique key tied to your account. You are responsible for keeping this key secure. We are not liable for any trading losses, broker actions, or data exposure resulting from misuse of the EA or your API key.

The EA is provided as-is. We make no warranty that it will be free from errors or compatible with all MT5 builds or broker configurations.`,
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
    content: `You may stop using the Service and delete your account at any time by contacting support@xaujournal.com. We will process account deletion requests within 30 days.

We may terminate or suspend your account at any time, with or without notice, for violation of these Terms or any other reason we deem necessary to protect the integrity of the platform. Upon termination, your right to use the Service ceases immediately.`,
  },
  {
    id: 'governing-law',
    title: '11. Governing law',
    content: `These Terms are governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or your use of the Service shall first be attempted to be resolved through good-faith negotiation.

If you have a dispute or complaint, please contact us first at support@xaujournal.com. We aim to resolve all issues within 5 business days.`,
  },
  {
    id: 'contact',
    title: '12. Contact',
    content: `For any questions regarding these Terms:\n\nEmail: support@xaujournal.com\n\nWe aim to respond within two business days.`,
  },
];

export function TermsOfServicePage() {
  const navigate = useNavigate();
  const navRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const { isLightMode, toggleTheme } = useAppTheme();

  useEffect(() => {
    const onScroll = () => setShowScroll(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

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
      if (window.scrollY > 10) {
        nav.classList.add('bg-background', 'border-b', 'border-border/50', 'shadow-xl');
        nav.classList.remove('bg-transparent', 'border-transparent');
      } else {
        nav.classList.remove('bg-background', 'border-b', 'border-border/50', 'shadow-xl');
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
        <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-[100px] opacity-60 mix-blend-screen" />
      </div>

      {/* ── Nav ───────────────────────────────────────────────── */}
      <header>
        <nav ref={navRef} className="fixed top-0 left-0 right-0 z-[100] h-16 flex items-center justify-between px-6 transition-all duration-500 ease-out border-b border-transparent bg-transparent">
          <button onClick={() => { navigate('/'); window.scrollTo(0,0); }} aria-label="Go home" className="flex items-center gap-2 hover:opacity-80 transition-opacity z-50">
            <span className="text-lg font-bold tracking-tighter">xaujournal</span>
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

          <div className="flex items-center gap-2 z-50">
            <button onClick={toggleTheme} className="flex p-2.5 rounded-full border border-border/40 hover:bg-muted active:scale-90 transition-all duration-300 text-foreground/70 hover:text-foreground items-center justify-center">
              {isLightMode ? <MoonStarsFill className="w-3.5 h-3.5" /> : <SunFill className="w-3.5 h-3.5" />}
            </button>
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
          <div className={`md:hidden fixed inset-0 bg-background z-[200] transition-all duration-500 ease-[var(--apple-ease)] ${mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
            <div className="flex flex-col items-center justify-center h-full gap-12 px-6">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-6 right-6 p-2 text-foreground/40 hover:text-foreground transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              {[{to:'/',l:'Home'},{to:'/pricing',l:'Pricing'},{to:'/contact',l:'Contact'}].map(({to,l})=>(
                <NavLink key={to} to={to} onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black tracking-tight text-foreground hover:text-primary transition-colors">
                  {l}
                </NavLink>
              ))}
              <button onClick={()=>navigate('/login')} className="mt-4 glass text-foreground text-lg font-bold tracking-wide px-10 py-4 rounded-full shadow-lg hover:bg-foreground/10 active:scale-95 transition-all duration-300">
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
            Terms of Service
          </motion.h1>
          <motion.p variants={itemVariants} className="text-lg text-muted-foreground font-medium leading-relaxed mb-2">
            Simple, honest terms for a simple, honest product.
          </motion.p>
          <motion.p variants={itemVariants} className="text-sm text-muted-foreground/70 font-medium">
            Effective date: April 26, 2026 · Last updated: April 26, 2026
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
                    {s.title.replace(/^\d+\.\s/, '')}
                  </a>
                </motion.li>
              ))}
            </ul>
          </nav>

          {/* Terms content */}
          <motion.article initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
            <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm mb-12 shadow-inner">
              <p className="text-sm md:text-base leading-relaxed font-medium text-foreground">
                <strong className="text-primary mr-2 font-bold">Summary:</strong>
                Use xaujournal responsibly. Your data is yours. We don't give financial advice. Pro subscriptions auto-renew and can be cancelled anytime.
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
                    {s.content.split('\n\n').map((block, i) => (
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
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tighter">xaujournal</span>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2 text-xs font-medium text-muted-foreground/60">
            <div className="flex items-center gap-3">
              <span>© {new Date().getFullYear()} xaujournal</span>
              <span className="w-1 h-1 rounded-full bg-border/40" />
              <NavLink to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</NavLink>
              <span className="w-1 h-1 rounded-full bg-border/40" />
              <NavLink to="/terms-and-conditions" className="hover:text-primary transition-colors">Terms of Service</NavLink>
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
