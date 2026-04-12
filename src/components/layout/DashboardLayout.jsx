import { NavLink, Outlet } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTrades } from '../../hooks/useTrades';
import { useJournals } from '../../hooks/useJournals';
import { useWallet } from '../../hooks/useWallet';

export function DashboardLayout({ user, plan, setShowPricingModal }) {
  const { isLightMode, toggleTheme } = useAppTheme();
  
  const { trades, isLoadingTrades, addTrade, removeTrade, editTrade } = useTrades(user);
  const { journals, isLoadingJournals, saveJournalEntry, deleteEntry } = useJournals(user);
  const { startingBalance, updateBalance } = useWallet();

  const navigation = [
    { id: '', name: 'Log' },
    { id: 'history', name: 'History' },
    { id: 'calendar', name: 'Calendar' },
    { id: 'analytics', name: 'Analytics' },
    { id: 'journal', name: 'Journal' }
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0 flex items-center gap-2 cursor-default">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-400 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary/20">XAU</div>
                <span className="font-bold tracking-tight hidden sm:block">Journal</span>
              </div>
              
              <div className="hidden md:flex items-center gap-1">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={`/${item.id}`}
                    className={({ isActive }) => 
                      `px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        (item.id === '' ? window.location.pathname === '/' || window.location.pathname === '' : isActive)
                          ? 'bg-primary/10 text-primary shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`
                    }
                  >
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme} 
                className={`
                  relative w-12 h-6 rounded-full p-1 transition-all duration-500 ease-in-out border border-border/50 shadow-inner
                  ${isLightMode ? 'bg-muted/80' : 'bg-primary/20'}
                `}
                aria-label="Toggle theme"
              >
                <div 
                  className={`
                    absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-500 transform
                    ${isLightMode ? 'translate-x-0 bg-white shadow-sm' : 'translate-x-6 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]'}
                  `}
                >
                  {isLightMode ? (
                    <svg className="w-2.5 h-2.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>
                  ) : (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-3 pl-4 border-l border-border/40">
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-xs font-semibold">{user?.email?.split('@')[0]}</span>
                  <button 
                    onClick={() => setShowPricingModal(true)}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider hover:bg-primary/20 transition-colors"
                  >
                    {plan}
                  </button>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-muted to-border border border-border overflow-hidden flex items-center justify-center shadow-inner">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{user?.email?.[0].toUpperCase()}</span>
                  )}
                </div>
                <button 
                  onClick={() => signOut(auth)} 
                  className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Logout"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Outlet context={{ 
          user, plan, setShowPricingModal,
          trades, isLoadingTrades, addTrade, removeTrade, editTrade,
          journals, isLoadingJournals, saveJournalEntry, deleteEntry,
          startingBalance, updateBalance
        }} />
      </main>
    </div>
  );
}

