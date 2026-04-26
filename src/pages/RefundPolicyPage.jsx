import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Lenis from 'lenis';
import { useAppTheme } from '../hooks/useAppTheme';
import { MoonStarsFill, SunFill } from 'react-bootstrap-icons';

const SECTIONS = [
  {
    id: 'overview',
    title: '1. Overview',
    content: `xaujournal operates on a subscription basis. We want you to have a great experience with the platform, and we aim to be fair and transparent about our refund approach.

Please read this policy carefully before subscribing. By completing a purchase, you confirm that you have read and agree to this Refund Policy.`,
  },
  {
    id: 'no-refunds',
    title: '2. General no-refund policy',
    content: `All subscription payments to xaujournal are non-refundable by default. This applies to:

• Monthly Pro subscription charges
• Any partial months remaining after cancellation
• Unused features or periods during an active billing cycle

When you subscribe to xaujournal Pro, you gain immediate access to all Pro features. Because digital access is delivered instantly and cannot be "returned," we do not offer refunds for subscription fees already charged.`,
  },
  {
    id: 'cancellation',
    title: '3. Cancellation',
    content: `You may cancel your Pro subscription at any time through the billing portal in your account settings. Cancellation stops future charges but does not trigger a refund for the current billing period.

Upon cancellation, you will retain full Pro access until the end of your current paid billing cycle. After that date, your account will revert to the free tier automatically.

To cancel: go to Account Settings → Manage Subscription → Cancel Plan.`,
  },
  {
    id: 'exceptions',
    title: '4. Exceptions & goodwill refunds',
    content: `We may issue a full or partial refund at our sole discretion in the following situations:

• Duplicate charges — if you were charged more than once for the same billing period due to a technical error, we will refund the duplicate charge in full.

• Service unavailability — if xaujournal experiences a verified outage lasting more than 72 consecutive hours in a single billing month, you may request a pro-rated credit for the affected period.

• Accidental purchase — if you contact us within 48 hours of your first-ever subscription charge and have not used any Pro features, we will consider a one-time refund.

To request a goodwill refund, email support@xaujournal.com with your account email, the charge date, and a brief description of the issue. We aim to respond within 2 business days.`,
  },
  {
    id: 'chargebacks',
    title: '5. Chargebacks',
    content: `If you initiate a chargeback with your bank or card provider without first contacting us, your account will be suspended immediately pending resolution. We strongly encourage you to contact us first — we are committed to resolving any billing issues fairly and quickly.

Fraudulent chargebacks may result in permanent account termination.`,
  },
  {
    id: 'free-tier',
    title: '6. Free tier',
    content: `xaujournal offers a free tier with limited features at no cost. There are no charges associated with the free tier, and therefore no refunds are applicable.

If you are on the free tier and wish to upgrade, review the features available on our Pricing page before subscribing.`,
  },
  {
    id: 'stripe',
    title: '7. Payment processor',
    content: `All payments are processed by Stripe, a PCI-DSS compliant payment processor. xaujournal does not store your card details.

Refunds approved by xaujournal are processed via Stripe and typically appear on your statement within 5–10 business days, depending on your bank. We have no control over how quickly your bank processes the credit.`,
  },
  {
    id: 'changes',
    title: '8. Changes to this policy',
    content: `We may update this Refund Policy from time to time. Material changes will be communicated via email to your registered address and via in-app notification at least 14 days before taking effect.

Continued use of xaujournal after the effective date of any changes constitutes your acceptance of the updated policy.`,
  },
  {
    id: 'contact',
    title: '9. Contact us',
    content: `For any billing or refund enquiries:\n\nEmail: support@xaujournal.com\n\nPlease include your account email and the transaction date in your message. We aim to respond within two business days.`,
  },
];

export function RefundPolicyPage() {
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
        <div className="absolute bottom-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-[100px] opacity-60 mix-blend-screen" />
      </div>

      {/* ── Nav ───────────────────────────────────────────────── */}
      <header>
        <nav ref={navRef} className="fixed top-0 left-0 right-0 z-[100] h-16 flex items-center justify-between px-6 transition-all duration-500 ease-out border-b border-transparent bg-transparent">
          <button onClick={() => { navigate('/'); window.scrollTo(0, 0); }} aria-label="Go home" className="flex items-center gap-2 hover:opacity-80 transition-opacity z-50">
            <span className="text-lg font-bold tracking-tighter">xaujournal</span>
          </button>

          <ul className="hidden md:flex items-center gap-1">
            {[{ to: '/', l: 'Home' }, { to: '/pricing', l: 'Pricing' }, { to: '/contact', l: 'Contact' }].map(({ to, l }) => (
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
            <button onClick={() => navigate('/login')} className="hidden md:block glass text-foreground text-sm font-bold tracking-wide px-5 py-2.5 rounded-full shadow-lg hover:bg-foreground/10 hover:-translate-y-0.5 transition-all duration-300">
              Get started
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-foreground">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          <div className={`md:hidden fixed inset-0 bg-background z-[200] transition-all duration-500 ease-[var(--apple-ease)] ${mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
            <div className="flex flex-col items-center justify-center h-full gap-12 px-6">
              <button onClick={() => setMobileMenuOpen(false)} className="absolute top-6 right-6 p-2 text-foreground/40 hover:text-foreground transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
              {[{ to: '/', l: 'Home' }, { to: '/pricing', l: 'Pricing' }, { to: '/contact', l: 'Contact' }].map(({ to, l }) => (
                <NavLink key={to} to={to} onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black tracking-tight text-foreground hover:text-primary transition-colors">
                  {l}
                </NavLink>
              ))}
              <button onClick={() => navigate('/login')} className="mt-4 glass text-foreground text-lg font-bold tracking-wide px-10 py-4 rounded-full shadow-lg hover:bg-foreground/10 active:scale-95 transition-all duration-300">
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
            Refund Policy
          </motion.h1>
          <motion.p variants={itemVariants} className="text-lg text-muted-foreground font-medium leading-relaxed mb-2">
            Transparent and fair. Here's exactly how refunds work.
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
                <motion.li key={s.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + (i * 0.05) }}>
                  <a href={`#${s.id}`} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors block leading-snug">
                    {s.title.replace(/^\d+\.\s/, '')}
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
                Subscriptions are non-refundable. You can cancel anytime and keep access until your billing period ends. If something went wrong on our end, contact us — we'll make it right.
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
            <div className="flex items-center gap-3 flex-wrap justify-center md:justify-end">
              <span>© {new Date().getFullYear()} xaujournal</span>
              <span className="w-1 h-1 rounded-full bg-border/40" />
              <NavLink to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</NavLink>
              <span className="w-1 h-1 rounded-full bg-border/40" />
              <NavLink to="/terms-and-conditions" className="hover:text-primary transition-colors">Terms of Service</NavLink>
              <span className="w-1 h-1 rounded-full bg-border/40" />
              <NavLink to="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</NavLink>
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
      </button>
    </div>
  );
}
