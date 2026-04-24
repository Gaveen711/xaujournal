import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  House, HouseFill,
  ClockHistory, ClockFill,
  Calendar3, Calendar3Fill,
  BarChartLine, BarChartLineFill,
  Book, BookFill,
  Stars,
  BoxArrowRight,
  SunFill,
  MoonStarsFill,
  CreditCard,
  PersonCircle,
  Lightning,
  LightningFill
} from 'react-bootstrap-icons';
import { auth } from '../../firebase';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTrades } from '../../hooks/useTrades';
import { useJournals } from '../../hooks/useJournals';
import { useWallet } from '../../hooks/useWallet';

export function DashboardLayout({ user, plan, expiry, totalTrades, totalJournals, setShowPricingModal, openPortal }) {
  const { isLightMode, toggleTheme } = useAppTheme();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const isGracePeriod = plan === 'grace';

  const profileMenuRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Show if scrolling up or at the very top
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Hide if scrolling down and not at the top
        setIsVisible(false);
        setShowProfileMenu(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { trades, isLoading: isLoadingTrades, addTrade, removeTrade, editTrade, resetTrades, lastMT5Sync } = useTrades(user);
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const thisMonthTradesCount = trades.filter(t => t.date >= monthStart).length;
  const { journals, isLoading: isLoadingJournals, saveJournalEntry, deleteEntry } = useJournals(user);
  const { startingBalance, updateBalance, monthlyGoal, updateMonthlyGoal, resetWallet } = useWallet(user);

  const [copied, setCopied] = useState(false);
  const copyUid = () => {
    navigator.clipboard.writeText(user?.uid || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navigation = [
    { id: '', name: 'Log', icon: House, iconSolid: HouseFill },
    { id: 'history', name: 'History', icon: ClockHistory, iconSolid: ClockFill },
    { id: 'calendar', name: 'Calendar', icon: Calendar3, iconSolid: Calendar3Fill },
    { id: 'analytics', name: 'Analytics', icon: BarChartLine, iconSolid: BarChartLineFill },
    { id: 'journal', name: 'Journal', icon: Book, iconSolid: BookFill },
    { id: 'sync', name: 'Sync', icon: Lightning, iconSolid: LightningFill }
  ];

  const activeIndex = navigation.findIndex(item => 
    item.id === '' ? (location.pathname === '/app' || location.pathname === '/app/') : location.pathname.startsWith(`/app/${item.id}`)
  );

  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-500 selection:bg-primary/20">
      
      {/* TOP NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 glass border-b border-border/40 safe-top transition-all duration-500 ease-[var(--apple-ease)] ${isVisible ? 'translate-y-0 opacity-100' : 'max-md:-translate-y-full max-md:opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            <div className="flex items-center gap-8">
              <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer group transition-all duration-300" onClick={() => (window.location.href = '/app')}>
                <span className="text-lg font-bold tracking-tighter group-hover:text-primary transition-colors duration-300">xaujournal</span>
                <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-[0.15em] border transition-all duration-500 ${plan === 'pro' ? 'bg-primary/20 text-primary border-primary/40 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'bg-white/5 text-foreground/40 border-white/10'}`}>
                  {plan}
                </div>
              </div>
              
              {/* DESKTOP NAV */}
              <div className="hidden md:flex relative bg-muted/20 p-1.5 rounded-full border border-border/20 backdrop-blur-md">
                <div 
                  className="absolute top-1.5 bottom-1.5 left-1.5 bg-background shadow-lg border border-border/50 rounded-full transition-all duration-500 ease-[var(--spring-bounce)]"
                  style={{ 
                    width: '115px', 
                    transform: `translateX(calc(${activeIndex === -1 ? 0 : activeIndex} * 115px))`,
                    opacity: activeIndex === -1 ? 0 : 1,
                    visibility: activeIndex === -1 ? 'hidden' : 'visible'
                  }}
                />
                
                {navigation.map((item) => {
                  const isActive = item.id === '' ? (location.pathname === '/app' || location.pathname === '/app/') : location.pathname.startsWith(`/app/${item.id}`);
                  const Icon = isActive ? item.iconSolid : item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={`/app/${item.id}`}
                      className={`relative z-10 w-[115px] py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 ${
                        isActive ? 'text-primary' : 'text-foreground/50 hover:text-foreground hover:scale-105'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                      {item.name}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-3 sm:gap-4 ml-2 pl-4 border-l border-border/20 relative" ref={profileMenuRef}>

              {plan === 'free' && (
                <button 
                  onClick={() => setShowPricingModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 group"
                >
                  <Stars className="w-3.5 h-3.5 text-primary group-hover:rotate-12 transition-transform duration-500" />
                  <span className="text-[10px] font-black uppercase text-primary">Upgrade</span>
                </button>
              )}

              {/* MT5 LIVE SYNC INDICATOR */}
              {lastMT5Sync && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 animate-in fade-in duration-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-green-500">MT5</span>
                </div>
              )}

              <button onClick={toggleTheme} className="p-2.5 rounded-xl border border-border/40 hover:bg-muted hover:scale-110 active:scale-90 transition-all duration-300 text-foreground/70 hover:text-foreground">
                {isLightMode ? <MoonStarsFill className="w-4 h-4" /> : <SunFill className="w-4 h-4" />}
              </button>

              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`w-10 h-10 rounded-xl bg-muted border flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-300 ${showProfileMenu ? 'border-primary ring-2 ring-primary/20' : 'border-border/40'}`}
              >
                <PersonCircle className={`w-5 h-5 transition-colors duration-300 ${showProfileMenu ? 'text-primary' : 'text-foreground/70'}`} />
              </button>

              {/* DROPDOWN */}
              {showProfileMenu && (
                <div className="absolute top-full right-0 mt-3 w-56 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] animate-in fade-in zoom-in-95 duration-200">

                  <div className="px-3 py-2 border-b border-border/20 mb-1">
                    <p className="text-[10px] font-black uppercase text-foreground/40">My Profile</p>
                    <p className="text-sm font-bold truncate text-foreground/90">{auth.currentUser?.email}</p>
                  </div>

                  {plan === 'pro' && (
                    <button onClick={() => { setShowProfileMenu(false); openPortal(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 text-primary transition-all duration-200 group">
                      <CreditCard className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-black uppercase">Manage Billing</span>
                    </button>
                  )}

                  {plan === 'free' && (
                    <button onClick={() => { setShowProfileMenu(false); setShowPricingModal(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 text-primary transition-all duration-200 group">
                      <Stars className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      <span className="text-[11px] font-black uppercase">Upgrade Account</span>
                    </button>
                  )}

                  {/* MT5 SYNC CREDENTIALS — Pro & grace only */}
                  {(plan === 'pro' || plan === 'grace') && (
                  <div className="px-3 py-3 border-t border-border/20 mt-1 space-y-2">
                    <p className="text-[10px] font-black uppercase text-foreground/80 mb-2">MT5 Auto-Sync</p>
                    {plan === 'grace' && (
                      <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest flex items-center gap-1 mb-1">
                        ⚠ Grace period active
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <p className="text-[9px] uppercase tracking-widest text-foreground/60">Your User ID</p>
                      <button
                        onClick={copyUid}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-muted/50 border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                      >
                        <span className="text-[10px] font-mono text-foreground truncate max-w-[140px]">{user?.uid}</span>
                        <span className={`text-[9px] font-black uppercase shrink-0 ml-2 transition-colors ${copied ? 'text-green-500' : 'text-primary group-hover:text-primary/80'}`}>
                          {copied ? '✓ Copied' : 'Copy'}
                        </span>
                      </button>
                      <p className="text-[9px] text-foreground/60 leading-relaxed">Paste into MT5 EA inputs to enable live sync.</p>
                    </div>
                    {lastMT5Sync && (
                      <p className="text-[9px] text-green-500 font-black uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                        Last sync: {lastMT5Sync.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  )}



                  <button onClick={() => { localStorage.removeItem('xau-auth-hint'); auth.signOut(); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-destructive mt-1 hover:bg-destructive/10 rounded-lg transition-all duration-200 group">
                    <BoxArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    <span className="text-[11px] font-black uppercase">Logout</span>
                  </button>

                </div>
              )}

            </div>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8 w-full">
        {plan === 'free' && (thisMonthTradesCount >= 50 || totalJournals >= 10) ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-8 animate-in fade-in zoom-in-95 duration-700">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 blur-3xl animate-pulse rounded-full" />
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-800 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10 border border-white/10 group">
                <BoxArrowRight className="w-10 h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
            </div>

            <div className="max-w-md space-y-3">
              <h2 className="text-3xl font-black text-gradient-red uppercase tracking-tighter">Terminal Locked</h2>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest leading-relaxed">
                {thisMonthTradesCount >= 50 ? "Free monthly limit reached (50/50)." : "Free journal limit reached (10/10)."} <br/>
                <span className="text-destructive font-black">Upgrade to Pro</span> to unlock unlimited operations and cognitive brief logs.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
              <button 
                onClick={() => setShowPricingModal(true)}
                className="flex-1 h-14 bg-primary text-primary-foreground font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                Go Pro Now
              </button>
              <button 
                onClick={() => auth.signOut()}
                className="flex-1 h-14 bg-muted border border-border/40 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-muted/80 transition-all text-foreground/50"
              >
                Logout
              </button>
            </div>

            <style>{`
              .text-gradient-red {
                background: linear-gradient(to bottom right, #ef4444, #991b1b);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
              }
            `}</style>
          </div>
        ) : (
          <Outlet context={{ 
            user, plan, expiry, totalTrades, setShowPricingModal, openPortal,
            trades, isLoadingTrades, addTrade, removeTrade, editTrade, resetTrades,
            journals, isLoadingJournals, saveJournalEntry, deleteEntry,
            startingBalance, updateBalance, monthlyGoal, updateMonthlyGoal, resetWallet, lastMT5Sync
          }} />
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full py-12 px-4 sm:px-6 lg:px-8 border-t border-border/10 bg-muted/5 relative overflow-hidden transition-all duration-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">

          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <span className="text-lg font-bold tracking-tighter group-hover:text-primary transition-colors duration-300">xaujournal</span>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3 uppercase font-black text-[10px] tracking-widest">
            <p className="text-foreground/30 flex items-center gap-3">
              © {new Date().getFullYear()} xaujournal 
              <span className="w-1 h-1 rounded-full bg-border/40" />
              <NavLink to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</NavLink>
            </p>

            <p className="flex gap-2">
              <span className="text-foreground/50">Curated by</span>
              <span className="cursor-help hover:scale-105 transition-transform duration-300" style={{ animation: "rgbCycle 3s linear infinite" }}>
                Gaveen Perera.
              </span>
            </p>
          </div>

        </div>

        <style>{`
          @keyframes rgbCycle {
              0%   { color: #ff0000; }
              16%  { color: #ff8000; }
              33%  { color: #ffff00; }
              50%  { color: #00ff00; }
              66%  { color: #0080ff; }
              83%  { color: #8000ff; }
              100% { color: #ff0000; }
          }
        `}</style>
      </footer>

      {/* MOBILE NAV */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 transition-all duration-500 ease-[var(--apple-ease)] ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="bg-background border border-border/40 rounded-[2rem] h-20 flex items-center justify-around shadow-2xl backdrop-blur-xl">

          {navigation.map((item) => {
            const isActive =
              item.id === ''
                ? (location.pathname === '/app' || location.pathname === '/app/')
                : location.pathname.startsWith(`/app/${item.id}`);

            const Icon = isActive ? item.iconSolid : item.icon;

            return (
              <NavLink key={item.name} to={`/app/${item.id}`} className={`flex flex-col items-center gap-1.5 transition-all duration-300 active:scale-90 ${isActive ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon className={`w-5 h-5 transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="text-[9px] font-black uppercase tracking-widest">{item.name}</span>
              </NavLink>
            );
          })}

        </div>
      </nav>

    </div>
  );
}