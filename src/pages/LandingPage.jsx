import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Lenis from 'lenis';
import { useAppTheme } from '../hooks/useAppTheme';
import { 
  MoonStarsFill, 
  SunFill, 
  CloudArrowDownFill, 
  LightningChargeFill, 
  BarChartLineFill 
} from 'react-bootstrap-icons';

/* ─── Data ───────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    title: 'Instant MT5 Sync',
    body: 'Our Expert Advisor watches your terminal and pushes every closed position to the cloud the moment it happens. Zero manual entry, absolute precision.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>,
    title: 'Deep Analytics',
    body: 'Win-rate by session, drawdown clusters, streak analysis, and behavioural heatmaps — every metric purpose-built for clarity.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
    title: 'Trade Calendar',
    body: 'A month-view calendar shows your P&L heat at a glance. Identify your best and worst days in a single look.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    title: 'Trade Journal',
    body: 'Attach thoughts, emotions, and notes to each trade. Build an annotated playbook straight from your own history.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    title: 'Bank-Grade Security',
    body: 'Strict isolated storage protocols mean your data is yours alone. Nobody — including us — can access your private trade history.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
    title: 'Session Intelligence',
    body: 'London, New York, Tokyo — see exactly which session your edge lives in and schedule your trading around it.',
  },
];

const STEPS = [
  { 
    id: '01',
    icon: <CloudArrowDownFill className="w-6 h-6" />, 
    title: 'Install the EA', 
    body: 'Drop our MQL5 Expert Advisor onto any chart in MT5. It runs silently and requires no manual action.' 
  },
  { 
    id: '02',
    icon: <LightningChargeFill className="w-6 h-6" />, 
    title: 'Trade normally', 
    body: 'The moment you close a position, the EA captures price, lot, P&L, and duration — and syncs everything instantly.' 
  },
  { 
    id: '03',
    icon: <BarChartLineFill className="w-6 h-6" />, 
    title: 'Find your edge', 
    body: 'Review analytics, annotate trades, and study your calendar. Turn raw executions into actionable intelligence.' 
  },
];

const STATS = [
  { value: 'Precision', label: 'Built specifically for traders' },
  { value: '1s',   label: 'MT5 sync latency' },
  { value: '100%',   label: 'Your data, your control' },
];

export function LandingPage() {
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

    return () => {
      lenis.destroy();
    };
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

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20 font-sans">
      
      {/* ── Ambient blobs ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-primary/10 blur-[100px] opacity-60 mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px] opacity-60 mix-blend-screen" />
      </div>

      {/* ── Nav ───────────────────────────────────────────────── */}
      <header>
        <nav ref={navRef} className="fixed top-0 left-0 right-0 z-[100] h-16 flex items-center justify-between px-12 transition-all duration-500 ease-out border-b border-transparent bg-transparent">
          <button onClick={() => window.scrollTo({top:0,behavior:'smooth'})} aria-label="Go to top"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity z-50">
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

      <main>
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto flex flex-col items-center">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-bold tracking-[0.2em] uppercase mb-10 shadow-sm shadow-primary/5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Excusively for Gold traders
            </motion.div>

            <motion.div variants={itemVariants}>
              <h1 className="text-[clamp(3rem,8vw,7.5rem)] font-black leading-[0.95] tracking-tighter mb-8 text-foreground drop-shadow-sm">
                Trade with <br />
                <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary-to to-purple-400">absolute clarity.</span>
              </h1>
            </motion.div>

            <motion.p variants={itemVariants} className="text-[clamp(1.1rem,2vw,1.25rem)] text-muted-foreground leading-relaxed max-w-2xl mb-12 font-medium">
              Automated MT5 sync, deep session analytics, and a beautiful calendar. Everything a professional trader needs to find their edge.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-4">
              <button onClick={()=>navigate('/login')} className="glass text-foreground text-sm font-bold tracking-wide px-8 py-4 rounded-full shadow-2xl hover:scale-105 hover:bg-foreground/10 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                Start journaling free
              </button>
              <Link to="/pricing" className="glass group inline-flex items-center gap-2 text-muted-foreground text-sm font-semibold px-8 py-4 rounded-full hover:bg-foreground/5 hover:text-foreground transition-all duration-300">
                See pricing 
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-8 md:gap-16 mt-24 border-t border-border/40 pt-12 w-full max-w-3xl">
              {STATS.map((s, i) => (
                <div key={s.label} className="text-center flex-1">
                  <div className="text-2xl md:text-3xl font-black tracking-tight text-foreground mb-1">{s.value}</div>
                  <div className="text-[0.65rem] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </section>


        {/* ── Features ──────────────────────────────────────────── */}
        <section id="features" className="relative z-10 py-32 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl mb-20"
            >
              <p className="text-primary text-sm font-bold tracking-[0.2em] uppercase mb-4">The Platform</p>
              <h2 className="text-[clamp(2rem,5vw,4rem)] font-black leading-[1.05] tracking-tight mb-6">
                Every tool you need.<br/>Nothing you don't.
              </h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                Designed from the ground up for serious traders. Experience the perfect balance of simplicity and power.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <FeatureCard key={f.title} {...f} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────── */}
        <section className="relative z-10 py-32 px-6 bg-muted/20 border-y border-border/50">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-24"
            >
              <p className="text-primary text-sm font-bold tracking-[0.2em] uppercase mb-4">Workflow</p>
              <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black leading-tight tracking-tight">Three steps to mastery</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10" />
              
              {STEPS.map((step, i) => (
                <motion.div 
                  key={step.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.2 }}
                  whileHover={{ y: -12, scale: 1.02 }}
                  className="relative p-8 rounded-[2.5rem] bg-card border border-border/50 shadow-xl hover:shadow-[0_30px_60px_-15px_rgba(139,92,246,0.15)] hover:border-primary/40 transition-all duration-500 group cursor-pointer"
                >
                  {/* Icon Badge */}
                  <div className="absolute -top-6 left-8 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-to text-white flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-primary/40 transition-all duration-500">
                    {step.icon}
                  </div>
                  
                  {/* Subtle Background Number */}
                  <div className="absolute top-8 right-8 text-7xl font-black text-foreground/[0.03] select-none group-hover:text-primary/[0.05] transition-colors duration-700">
                    {step.id}
                  </div>

                  <div className="mt-8">
                    <h3 className="text-2xl font-bold mb-4 tracking-tight group-hover:text-primary transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed font-medium text-base">
                      {step.body}
                    </p>
                  </div>

                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <section className="relative z-10 py-40 px-6 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl mx-auto relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-bold tracking-[0.2em] uppercase mb-8">
              Start today — it's free
            </div>
            <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[1] tracking-tighter mb-8 text-foreground">
              Stop guessing.<br />
              <span className="text-gradient">Start knowing.</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-12 font-medium max-w-xl mx-auto">
              Join the new standard of trading journals. Upgrade to Pro when you're ready for the full suite.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={()=>navigate('/login')} className="glass w-full sm:w-auto text-foreground text-base font-bold tracking-wide px-10 py-4 rounded-full shadow-xl hover:bg-foreground/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                Create free account
              </button>
              <Link to="/pricing" className="glass w-full sm:w-auto text-muted-foreground text-base font-semibold px-10 py-4 rounded-full hover:bg-foreground/5 hover:text-foreground transition-all duration-300">
                View pricing
              </Link>
            </div>
          </motion.div>
        </section>
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

/* ─── Feature card ───────────────────────────────────────────────── */
function FeatureCard({ icon, title, body, index }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="p-8 rounded-[2rem] bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card hover:border-primary/30 transition-all duration-300 group shadow-sm hover:shadow-xl hover:shadow-primary/5"
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-inner">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 tracking-tight group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-muted-foreground leading-relaxed font-medium">{body}</p>
    </motion.div>
  );
}