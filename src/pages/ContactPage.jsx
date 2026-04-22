import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Lenis from 'lenis';

export function ContactPage() {
    const navigate = useNavigate();
    const navRef = useRef(null);
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [status, setStatus] = useState('idle'); // idle | sending | sent | error
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

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.message) return;
        setStatus('sending');
        // Simulate send
        await new Promise(r => setTimeout(r, 1400));
        setStatus('sent');
    };

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
                <div className="absolute top-[15%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary/10 blur-[100px] opacity-60 mix-blend-screen" />
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

            <main className="relative z-10 px-6 pt-32 pb-32 max-w-6xl mx-auto min-h-screen">
                {/* Header */}
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="text-center max-w-2xl mx-auto mb-20">
                    <motion.p variants={itemVariants} className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">Contact</motion.p>
                    <motion.h1 variants={itemVariants} className="text-[clamp(2.5rem,6vw,4rem)] font-black leading-[1.05] tracking-tight mb-6">
                        Get in touch
                    </motion.h1>
                    <motion.p variants={itemVariants} className="text-lg text-muted-foreground font-medium leading-relaxed">
                        Questions, feedback, or a bug to report — we read every message and reply within one business day.
                    </motion.p>
                </motion.div>

                {/* Layout */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 max-w-5xl mx-auto">
                    {/* Info panel */}
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }}>
                        <div className="mb-12">
                            <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">Direct email</p>
                            <a href="mailto:support@xaujournal.com" className="text-xl font-bold hover:text-primary transition-colors duration-300">
                                support@xaujournal.com
                            </a>
                            <p className="text-sm text-muted-foreground mt-2 font-medium">Response within 1 business day.</p>
                        </div>

                        <div className="flex flex-col gap-5">
                            {[
                                { label: 'Bug reports', desc: 'Found something broken? Include your browser and what you did.' },
                                { label: 'Feature requests', desc: 'We actively shape the roadmap based on trader feedback.' },
                                { label: 'Billing & account', desc: 'Subscription issues, invoices, or cancellation help.' },
                            ].map((item, i) => (
                                <motion.div 
                                    key={item.label} 
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 + (i*0.1) }}
                                    className="p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm"
                                >
                                    <p className="text-sm font-bold mb-1.5">{item.label}</p>
                                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Form */}
                    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
                        {status === 'sent' ? (
                            <div className="p-10 rounded-[2rem] border border-primary/20 bg-primary/5 backdrop-blur-md text-center shadow-lg shadow-primary/5">
                                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-6">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                </div>
                                <h2 className="text-2xl font-black tracking-tight mb-3">Message sent</h2>
                                <p className="text-muted-foreground font-medium leading-relaxed">
                                    Thanks for reaching out — we'll reply to <strong className="text-foreground">{form.email}</strong> within one business day.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 p-8 md:p-10 rounded-[2rem] border border-border/50 bg-card/40 backdrop-blur-md shadow-xl">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[0.75rem] font-bold tracking-[0.1em] uppercase text-muted-foreground mb-2">Name *</label>
                                        <input value={form.name} onChange={set('name')} required placeholder="Your name" className="input-premium w-full bg-background/50" />
                                    </div>
                                    <div>
                                        <label className="block text-[0.75rem] font-bold tracking-[0.1em] uppercase text-muted-foreground mb-2">Email *</label>
                                        <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" className="input-premium w-full bg-background/50" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[0.75rem] font-bold tracking-[0.1em] uppercase text-muted-foreground mb-2">Subject</label>
                                    <input value={form.subject} onChange={set('subject')} placeholder="What's this about?" className="input-premium w-full bg-background/50" />
                                </div>
                                <div>
                                    <label className="block text-[0.75rem] font-bold tracking-[0.1em] uppercase text-muted-foreground mb-2">Message *</label>
                                    <textarea value={form.message} onChange={set('message')} required rows={6} placeholder="Tell us what's on your mind..." className="input-premium w-full bg-background/50 min-h-[140px] resize-y py-3" />
                                </div>
                                <button type="submit" disabled={status === 'sending'} className={`glass text-foreground font-bold tracking-wide py-4 mt-2 rounded-xl shadow-lg transition-all duration-300 relative overflow-hidden group ${status === 'sending' ? 'opacity-70 cursor-wait' : 'hover:-translate-y-1 hover:shadow-xl hover:bg-foreground/10'}`}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    {status === 'sending' ? 'Sending…' : 'Send message'}
                                </button>
                            </form>
                        )}
                    </motion.div>
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