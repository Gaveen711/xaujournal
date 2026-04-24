import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Lenis from 'lenis';
import { useAppTheme } from '../hooks/useAppTheme';
import { MoonStarsFill, SunFill } from 'react-bootstrap-icons';

const FREE_FEATURES = [
  '50 trades / month',
  'Basic P&L tracking',
  'Trade calendar',
  'Manual trade entry',
  'Email support',
];

const PRO_FEATURES = [
  'Unlimited trades',
  'Full analytics suite',
  'Session intelligence',
  'MT5 Expert Advisor sync',
  'TradingView webhook',
  'API key access',
  'Priority support',
  'Early access to new features',
];

const FAQ = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from the billing portal at any time. You keep Pro access until the end of your billing period — no partial-month charges.' },
  { q: 'Is my trading data secure?', a: 'Your data is secured using industry-standard encryption and isolated cloud storage. Only you have access to your trade history; we cannot read your private logs.' },
  { q: 'Does the EA work on mobile MT5?', a: 'Expert Advisors require the MT5 desktop terminal on Windows. The recommended workflow is to run the EA on your desktop while executing trades from mobile — data syncs in real time.' },
  { q: 'What payment methods do you accept?', a: 'All major credit and debit cards via Stripe. No PayPal at this time.' },
  { q: 'Is there a free trial for Pro?', a: 'The free plan provides full access to the core journaling experience. We are currently developing a Pro trial experience—sign up to be notified when it launches.' },
];

export function PricingPage() {
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
      {/* Ambient blob */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] rounded-full bg-primary/10 blur-[100px] opacity-60 mix-blend-screen" />
      </div>

      {/* Nav */}
      <header>
        <nav ref={navRef} className="fixed top-0 left-0 right-0 z-[100] h-16 flex items-center justify-between px-12 transition-all duration-500 ease-out border-b border-transparent bg-transparent">
          <button onClick={() => { navigate('/'); window.scrollTo(0,0); }} aria-label="Go home" className="flex items-center gap-2 hover:opacity-80 transition-opacity z-50">
            <span className="text-lg font-bold tracking-tighter">xaujournal</span>
          </button>

          <ul className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
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
          <motion.p variants={itemVariants} className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">Pricing</motion.p>
          <motion.h1 variants={itemVariants} className="text-[clamp(2.5rem,6vw,4rem)] font-black leading-[1.05] tracking-tight mb-6">
            Trade better. Stress less.
          </motion.h1>
          <motion.p variants={itemVariants} className="text-lg text-muted-foreground font-medium leading-relaxed">
            Start free. Upgrade when you're ready for the full system.
          </motion.p>
        </motion.div>

        {/* Cards */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-32">
          {/* Free card */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="rounded-[2rem] border border-border/50 bg-card/40 backdrop-blur-sm p-10 flex flex-col hover:border-primary/30 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-primary/5"
          >
            <div className="mb-8">
              <p className="text-xs font-bold tracking-[0.14em] uppercase text-muted-foreground mb-4">Free</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black tracking-tight leading-none">$0</span>
                <span className="text-sm font-medium text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed font-medium">Everything you need to get started and build the habit.</p>
            </div>
            
            <ul className="flex-1 space-y-4 mb-8">
              {FREE_FEATURES.map(f=>(
                <li key={f} className="flex items-center gap-3 text-sm font-medium border-b border-border/30 pb-3 last:border-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            
            <button onClick={()=>navigate('/login')} className="w-full py-4 rounded-xl border border-border/50 bg-transparent text-foreground text-sm font-bold tracking-wide hover:bg-muted transition-all duration-300">
              Get started free
            </button>
          </motion.div>

          {/* Pro card */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
            className="relative rounded-[2rem] border border-primary/40 bg-card p-10 flex flex-col overflow-hidden shadow-2xl shadow-primary/10 hover:shadow-primary/20 transition-all duration-500"
          >
            {/* Glow */}
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/20 blur-[40px] pointer-events-none" />

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <p className="text-xs font-bold tracking-[0.14em] uppercase text-primary mb-4">Pro Version</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary-to">$29.99</span>
                  <span className="text-sm font-medium text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">or $199/year <span className="text-primary font-bold">— save over 40%</span></p>
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed font-medium">The complete system for serious gold traders.</p>
              </div>
              <span className="text-[10px] font-black tracking-[0.1em] uppercase px-3 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap border border-primary/20">
                Most popular
              </span>
            </div>
            
            <ul className="flex-1 space-y-4 mb-8 relative z-10">
              {PRO_FEATURES.map(f=>(
                <li key={f} className="flex items-center gap-3 text-sm font-medium border-b border-primary/10 pb-3 last:border-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            
            <button onClick={()=>navigate('/login')} className="w-full py-4 rounded-xl border-none bg-primary text-primary-foreground text-sm font-bold tracking-wide hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 relative z-10">
              Upgrade to Pro
            </button>
          </motion.div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-[clamp(1.5rem,3vw,2.25rem)] font-black tracking-tight mb-12 text-center"
          >
            Frequently asked questions
          </motion.h2>
          <div className="flex flex-col">
            {FAQ.map((item, i) => (
              <FAQItem key={item.q} {...item} index={i} />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
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

function FAQItem({ q, a, index }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}
      className="border-b border-border/50"
    >
      <button onClick={()=>setOpen(o=>!o)} className="w-full bg-transparent border-none text-left py-6 cursor-pointer flex items-center justify-between gap-4 text-foreground group">
        <span className="text-base font-bold tracking-tight group-hover:text-primary transition-colors">{q}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-muted-foreground group-hover:text-primary transition-transform duration-300 ${open ? 'rotate-180' : 'rotate-0'}`}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div className={`overflow-hidden transition-all duration-400 ease-[0.22,1,0.36,1] ${open ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="pb-6 text-sm text-muted-foreground leading-relaxed font-medium">{a}</p>
      </div>
    </motion.div>
  );
}