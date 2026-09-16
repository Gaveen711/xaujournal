import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Moon,
  RefreshCcw,
  Settings,
  Sparkles,
  Sun,
  TriangleAlert,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { auth, signOutAndClearCache } from '../../firebase';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSessionBrokerAccounts, useSessionWallet } from '../../app/di/AuthenticatedSessionContext.jsx';
import Logo from '../Logo';
import { useTrades } from '../../hooks/useTrades';
import { useJournals } from '../../hooks/useJournals';
import { useSetups } from '../../hooks/useSetups';
import { useDisciplineSettings } from '../../hooks/useDisciplineSettings';
import { useDisciplineViolations } from '../../hooks/useDisciplineViolations';
import { useToast } from '../ToastContext';
import { DashboardRightSidebar } from './DashboardRightSidebar';
import { AppDialog } from '../app/AppDialog';
import { StatusSquare } from '../app/StatusSquare';
import { Button, buttonVariants } from '../ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '../ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { isPaidPlan } from '../../lib/entitlements.js';
import { ACCENT_TEMPLATES } from '../../lib/accentTemplates.js';
import { WalletTopUpDialog } from '../app/WalletTopUpDialog';
import { FloatingDockNavigation } from '../ui/FloatingDockNavigation';
import { formatCurrency } from '../../lib/tradeUtils';


// Minimum gap between automatic broker syncs for the same account.
const BACKGROUND_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;

export function DashboardLayout({ user, analytics, plan, expiry, isTrial, isTrialExpired, totalTrades, setShowPricingModal, openPortal }) {
  const { isLightMode, toggleTheme, currentTemplate, setTemplate } = useAppTheme();
  const { accounts, syncAccount, hasSessionCredential } = useSessionBrokerAccounts();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('xau-sidebar-expanded');
    return saved !== 'false'; // default to true
  });
  const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(false);
  // Owned by the layout, not by renderProfileMenu: that helper runs twice (the
  // sidebar footer and the mobile header), and a dialog per copy would mount
  // two of them.
  const [walletTopUpOpen, setWalletTopUpOpen] = useState(false);

  const displayName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Trader';

  // Clears the on-disk Firestore cache as part of signing out, so the next
  // person on this machine cannot inherit the previous user's trade data.
  // Ends in a full page load — the Firestore instance is terminated.
  const handleSignOut = async () => {
    try {
      await signOutAndClearCache();
    } catch (error) {
      console.error('Sign out failed:', error);
      toast('Could not sign out. Please try again.', 'error');
    }
  };
  const userInitial = displayName?.trim()?.charAt(0)?.toUpperCase() || 'T';
  const notificationItems = [
    {
      id: 'welcome',
      icon: Sparkles,
      title: 'Welcome to XauJournal',
      body: 'Your premium trading journey begins now.',
      tone: 'bg-primary/10 text-primary',
    },
    {
      id: 'setup',
      icon: TriangleAlert,
      title: 'Complete setup',
      body: 'Connect your MT4/MT5 account to auto-sync trades.',
      tone: 'bg-muted text-muted-foreground',
    },
  ];
  const [dismissedNotifications, setDismissedNotifications] = useState([]);
  const visibleNotifications = notificationItems.filter(item => !dismissedNotifications.includes(item.id));
  const dismissNotification = (id) => {
    setDismissedNotifications(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  const handleSidebarOpenChange = (open) => {
    setSidebarOpen(open);
    localStorage.setItem('xau-sidebar-expanded', String(open));
  };

  const [trialTimeLeft, setTrialTimeLeft] = useState('');
  const hasActivePaidAccess = isPaidPlan(plan);
  const hasLegacyTrial = !hasActivePaidAccess && isTrial;
  const computedIsTrialActive = hasLegacyTrial && expiry && new Date(expiry) > new Date();
  const computedIsTrialExpired = hasLegacyTrial && expiry && new Date(expiry) < new Date();
  const planBadgeLabel = hasActivePaidAccess ? plan : `${plan} tier`;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateTimers = () => {
      if (!hasLegacyTrial || !expiry) {
        setTrialTimeLeft('');
        return;
      }

      const now = new Date();
      const exp = new Date(expiry);
      const diff = exp - now;
      if (diff > 0) {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        setTrialTimeLeft(`${d}d ${h}h ${m}m`);
      } else {
        setTrialTimeLeft('Expired');
      }
    };

    updateTimers();
    const intervalId = setInterval(updateTimers, 60_000);
    return () => clearInterval(intervalId);
  }, [hasLegacyTrial, expiry]);

  // Background sync on dashboard load / mount.
  // Throttled per account: this POSTs to a paid MetaAPI sync, and without a
  // guard every page refresh triggered another one. New MT5 trades still arrive
  // live through the realtime trade listener, so this only suppresses the pull,
  // not the display. Manual sync from the EA screen is unaffected.
  useEffect(() => {
    if (accounts.length === 0) return;
    const activeAccount = accounts[0];
    if (activeAccount.requiresReconnect) return;
    // Broker passwords are held for the tab session only, so a fresh browser
    // session has nothing to sync with. Skip quietly and let the user trigger a
    // manual sync — firing a request that is guaranteed to fail would just
    // burn the throttle window.
    if (!hasSessionCredential(activeAccount.id)) return;

    const storageKey = `xau-last-broker-sync-${activeAccount.id}`;
    const last = Number(sessionStorage.getItem(storageKey) || 0);
    if (Date.now() - last < BACKGROUND_SYNC_MIN_INTERVAL_MS) return;
    sessionStorage.setItem(storageKey, String(Date.now()));

    syncAccount(activeAccount.id)
      .then(() => {
        console.log('Background broker sync successful.');
      })
      .catch((err) => {
        console.warn('Background broker sync failed:', err);
        // Let the next mount retry rather than waiting out the window.
        sessionStorage.removeItem(storageKey);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.length]);

  // Mobile chrome hides on scroll-down, returns on scroll-up.
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    let frameId = 0;
    let lastScrollY = window.scrollY;
    const updateVisibility = () => {
      frameId = 0;
      const currentScrollY = window.scrollY;
      const nextVisible = currentScrollY < lastScrollY || currentScrollY < 50;
      setIsVisible((visible) => visible === nextVisible ? visible : nextVisible);
      lastScrollY = currentScrollY;
    };
    const handleScroll = () => {
      if (!frameId) frameId = window.requestAnimationFrame(updateVisibility);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  const { trades, isLoading: isLoadingTrades, isLoadingMore, hasMoreTrades, loadMoreTrades, loadAllTrades, addTrade, removeTrade, editTrade, resetTrades, lastMT5Sync, error: tradesError, reload: reloadTrades } = useTrades(user);

  const { journals, isLoading: isLoadingJournals, saveJournalEntry, deleteEntry, deleteAllEntries, error: journalsError, reload: reloadJournals } = useJournals(user);
  const { walletBalance, updateBalance, monthlyGoal, updateMonthlyGoal, resetWallet, error: walletError, reload: reloadWallet } = useSessionWallet();

  // Surface load failures explicitly: a dead listener rendered as an empty
  // trade list or a $0 balance reads as data loss to a trader.
  const dataLoadError = tradesError || journalsError || walletError;
  const retryDataLoads = () => {
    if (tradesError) reloadTrades();
    if (journalsError) reloadJournals();
    if (walletError) reloadWallet();
  };

  // Load permissions from localStorage
  const [syncPermissions, setSyncPermissions] = useState(() => {
    try {
      const saved = localStorage.getItem(`xau-sync-permissions-${user?.uid}`);
      return saved ? JSON.parse(saved) : {
        readPositions: true,
        tradeHistory: true,
        accountBalance: true,
        executeTrades: false
      };
    } catch {
      return {
        readPositions: true,
        tradeHistory: true,
        accountBalance: true,
        executeTrades: false
      };
    }
  });

  // Listen for changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem(`xau-sync-permissions-${user?.uid}`);
        if (saved) {
          setSyncPermissions(JSON.parse(saved));
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('xau-permissions-changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('xau-permissions-changed', handleStorageChange);
    };
  }, [user]);

  const displayedTrades = syncPermissions.tradeHistory ? trades : [];
  const displayedWalletBalance = syncPermissions.accountBalance ? walletBalance : 0;

  // Setup catalog and discipline settings/flags, wired once here so every route
  // reads the same catalog and the same rule set through the outlet context.
  const {
    setups, setupsById, resolveSetup, createSetup, renameSetup, mergeSetups, archiveSetup, deleteSetup,
    loading: isLoadingSetups,
  } = useSetups(user);
  const {
    rules: disciplineRules, enabledRuleIds, saveRules: saveDisciplineRules,
    isSaving: isSavingDisciplineRules, loading: isLoadingDisciplineRules,
  } = useDisciplineSettings(user);
  // Fed the DISPLAYED trade list and balance on purpose: with the balance
  // permission off the risk rule sees no balance and fails open, which is the
  // documented behaviour rather than flagging against a balance the user has
  // withheld.
  const { violations: disciplineViolations, byTradeId: disciplineViolationsByTradeId, indeterminateDayKey: indeterminateDisciplineDayKey } = useDisciplineViolations({
    trades: displayedTrades,
    hasMore: hasMoreTrades,
    rules: disciplineRules,
    accountBalance: displayedWalletBalance,
  });

  const navigation = [
    { id: '', name: 'Dashboard', icon: LayoutDashboard, group: 'Workspace' },
    { id: 'history', name: 'History', icon: Clock3, group: 'Workspace' },
    { id: 'calendar', name: 'Calendar', icon: CalendarDays, group: 'Workspace' },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, group: 'Intelligence' },
    { id: 'journal', name: 'Journal', icon: BookOpen, group: 'Intelligence' },
    { id: 'sync', name: 'Broker sync', icon: RefreshCcw, group: 'System' },
    { id: 'settings', name: 'Settings', icon: Settings, group: 'System' }
  ];

  const isNavItemActive = (item) => item.id === ''
    ? (location.pathname === '/app' || location.pathname === '/app/') && !location.search.includes('tab=log')
    : location.pathname.startsWith(`/app/${item.id}`);

  const isLogRoute = location.pathname === '/app' || location.pathname === '/app/';
  const activeNavigationItem = navigation.find(isNavItemActive) ?? navigation[0];
  const ActiveNavigationIcon = activeNavigationItem.icon;
  const mobileNavigation = navigation
    .filter((item) => ['', 'history', 'calendar', 'analytics', 'journal', 'settings'].includes(item.id))
    .map((item) => ({
      ...item,
      to: `/app/${item.id}`,
      active: item.id === '' ? isLogRoute : location.pathname.startsWith(`/app/${item.id}`),
    }));

  // Broker sync status, encoded by form (StatusSquare), never by pulse or glow.
  const brokerStatus = (() => {
    if (accounts.length === 0) return null;
    const acc = accounts[0];
    let status = { state: 'on', label: 'Active', desc: 'Syncing automatically' };
    if (acc.lastSyncStatus === 'failed') {
      status = { state: 'attn', label: 'Disconnected', desc: 'Connection failed' };
    } else if (acc.lastSyncTime) {
      const elapsedMinutes = (currentTime - new Date(acc.lastSyncTime).getTime()) / 60000;
      if (elapsedMinutes > 5) {
        status = { state: 'attn', label: 'Sync delayed', desc: `Last sync ${Math.round(elapsedMinutes)}m ago` };
      }
    }
    return { account: acc, ...status };
  })();

  const renderProfileMenu = ({ align = 'start', compact = false } = {}) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          compact
            ? 'flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-medium text-foreground hover:bg-muted/70'
            : 'dashboard-profile-row flex min-h-12 w-full items-center gap-2 rounded-xl border border-border bg-card p-1.5 text-left text-foreground hover:bg-muted/60 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0'
        )}
        aria-label="Account menu"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-medium text-foreground">
          {userInitial}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1 truncate text-xs font-medium capitalize group-data-[collapsible=icon]:hidden">
              {displayName}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" aria-hidden="true" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64">
        {/* Identity. Not a heading over the menu — it is the reason the menu
            exists, so it carries the avatar and the plan the account is on. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-medium text-foreground">
              {userInitial}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium capitalize text-foreground">{displayName}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">{auth.currentUser?.email}</span>
              <span className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                {planBadgeLabel}
              </span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* Wallet. Account state with no home in the nav, which is exactly what
            this menu is for — and the balance is the figure most worth seeing
            without navigating anywhere. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-baseline justify-between gap-3 py-1.5 font-normal">
            <span className="text-xs text-muted-foreground">Wallet balance</span>
            <span className="figure text-sm text-foreground">{formatCurrency(walletBalance || 0)}</span>
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setWalletTopUpOpen(true)}>
            <Wallet aria-hidden="true" />
            Top up wallet
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => openPortal()}>
            <CreditCard aria-hidden="true" />
            Manage subscription
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={handleSignOut}
          >
            <LogOut aria-hidden="true" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const notificationsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'relative')}
        aria-label="Notifications"
      >
        <Bell aria-hidden="true" />
        {visibleNotifications.length > 0 && (
          <span className="absolute top-1 right-1 size-1.5 rounded-sm bg-primary" aria-hidden="true" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            Notifications
            {visibleNotifications.length > 0 && (
              <span className="figure text-[11px] text-muted-foreground">{visibleNotifications.length} new</span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {visibleNotifications.length > 0 ? visibleNotifications.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-start gap-2.5 rounded-md p-2 hover:bg-muted">
                <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', item.tone)}>
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-foreground">{item.title}</span>
                  <span className="block text-xs leading-snug text-muted-foreground">{item.body}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => dismissNotification(item.id)}
                  aria-label={`Dismiss ${item.title}`}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            );
          }) : (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">All clear. No active notifications.</p>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const themeToggleButton = (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {isLightMode ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
    </Button>
  );

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={handleSidebarOpenChange}
      className="dashboard-shell bg-background"
    >
      {/* DESKTOP SIDEBAR */}
      <Sidebar collapsible="icon" className="dashboard-sidebar hidden md:flex">
        <SidebarHeader className="px-3 pt-4 pb-2 group-data-[collapsible=icon]:px-0">
          {/* Collapsed to the icon rail there is only room for one control per
              line, so the row becomes a column — side by side the brand mark
              and the trigger were pressed against each other. */}
          <div className="flex min-h-11 items-center gap-2 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="dashboard-brand flex min-w-0 flex-1 items-center gap-2.5 rounded-lg group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center"
              aria-label="Go to dashboard"
            >
              <span className="dashboard-brand-mark flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                <Logo onlyIcon iconSize="size-5" />
              </span>
              <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="block truncate text-sm font-semibold tracking-[-0.02em] text-foreground">XAU Journal</span>
                <span className="block truncate font-mono text-[10px] uppercase tracking-[0.16em] text-primary">{planBadgeLabel}</span>
              </span>
            </button>
            <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent className="px-1 py-2">
          {['Workspace', 'Intelligence', 'System'].map((group) => (
            <SidebarGroup key={group} className="py-1.5">
              <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.16em]">{group}</SidebarGroupLabel>
              <SidebarMenu>
                {navigation.filter((item) => item.group === group).map((item) => {
                  const active = isNavItemActive(item);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        className="dashboard-nav-item h-10 rounded-lg px-2.5"
                        isActive={active}
                        tooltip={item.name}
                        render={<NavLink to={`/app/${item.id}`} />}
                      >
                        <Icon aria-hidden="true" />
                        <span>{item.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="gap-3">
          {/* BROKER SYNC STATUS */}
          {brokerStatus && (
            <button
              type="button"
              className="dashboard-status-panel w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none group-data-[collapsible=icon]:hidden"
              onClick={() => navigate('/app/sync')}
              aria-label="Open broker sync"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Broker terminal</span>
                <StatusSquare state={brokerStatus.state} label={brokerStatus.label}>
                  {brokerStatus.label}
                </StatusSquare>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">
                    {brokerStatus.account.accountName || brokerStatus.account.server}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{brokerStatus.desc}</p>
                </div>
                {brokerStatus.state !== 'on' && (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground" aria-hidden="true">
                    <RefreshCcw aria-hidden="true" />
                  </span>
                )}
              </div>
            </button>
          )}

          {/* TRIAL STATUS */}
          {hasLegacyTrial && (
            computedIsTrialActive ? (
              <div className="dashboard-status-panel rounded-xl border border-border bg-card p-3 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-xs font-medium text-foreground">Pro access active</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Temporary Pro access ends in <span className="figure text-foreground">{trialTimeLeft}</span>.
                </p>
                <Button size="sm" className="mt-2 w-full" onClick={() => setShowPricingModal?.(true)}>
                  Upgrade to Pro
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-2">
                  <TriangleAlert className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                  <span className="text-xs font-medium text-destructive">Pro access ended</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Upgrade to keep broker sync, advanced analytics, and connected trade history.
                </p>
                <Button size="sm" className="mt-2 w-full" onClick={() => setShowPricingModal?.(true)}>
                  Upgrade to Pro
                </Button>
              </div>
            )
          )}

          {/* PROFILE ROW */}
          {renderProfileMenu()}
        </SidebarFooter>
      </Sidebar>

      {/* MAIN COLUMN */}
      <SidebarInset className="dashboard-main-shell bg-background">
        <header className="dashboard-command-bar sticky top-0 z-20 hidden min-h-16 items-center justify-between gap-6 border-b border-border px-6 md:flex lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <ActiveNavigationIcon aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{activeNavigationItem.group}</p>
              <p className="truncate text-sm font-semibold text-foreground">{activeNavigationItem.name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => openPortal?.()}
              title="Manage billing and view invoices"
              aria-label="Manage billing and view invoices"
              className="dashboard-command-chip hidden cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/60 lg:flex"
            >
              <CircleDollarSign className="size-4 text-primary" aria-hidden="true" />
              <span className="text-xs capitalize text-muted-foreground">{planBadgeLabel}</span>
            </button>
            <div className="dashboard-command-chip hidden rounded-lg border border-border bg-card px-3 py-2 xl:block">
              <span className="figure text-xs text-muted-foreground">
                {new Date(currentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {themeToggleButton}
            {notificationsMenu}
          </div>
        </header>

        {/* MOBILE HEADER */}
        <header
          className={cn(
            'dashboard-mobile-header fixed top-0 right-0 left-0 z-20 border-b border-border bg-card transition-transform duration-200 md:hidden',
            isVisible ? 'translate-y-0' : '-translate-y-full'
          )}
        >
          <div className="flex h-14 items-center justify-between px-4">
            <button type="button" onClick={() => navigate('/app')} aria-label="Go to dashboard">
              <Logo iconSize="size-7" />
            </button>
            <div className="flex items-center gap-1.5">
              {themeToggleButton}
              {notificationsMenu}
              {renderProfileMenu({ align: 'end', compact: true })}
            </div>
          </div>
        </header>

        {/* CONTENT GRID */}
        <div className="dashboard-content mx-auto flex w-full max-w-[1850px] min-w-0 flex-1 flex-col-reverse overflow-x-hidden px-3 pt-20 pb-32 sm:px-4 md:px-6 md:py-6 md:pb-8 min-[1440px]:flex-row lg:px-8">
          <div className="relative w-full min-w-0 flex-1 overflow-x-hidden">
            {dataLoadError && (
              <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
                <span>
                  Some of your data didn't load. Your trades and journals are safe on the server — this is a connection problem, not data loss.
                </span>
                <Button variant="outline" size="sm" onClick={retryDataLoads}>
                  Retry
                </Button>
              </div>
            )}
            <Outlet context={{
              user, plan, expiry, isTrial, isTrialExpired, totalTrades, analytics, setShowPricingModal, openPortal,
              trades: displayedTrades, isLoadingTrades, isLoadingMore, hasMoreTrades, loadMoreTrades, loadAllTrades, addTrade, removeTrade, editTrade, resetTrades,
              journals, isLoadingJournals, saveJournalEntry, deleteEntry, deleteAllEntries,
              walletBalance: displayedWalletBalance, updateBalance, monthlyGoal, updateMonthlyGoal, resetWallet, lastMT5Sync,
              setups, setupsById, resolveSetup, createSetup, renameSetup, mergeSetups, archiveSetup, deleteSetup, isLoadingSetups,
              disciplineRules, enabledRuleIds, saveDisciplineRules, isSavingDisciplineRules, isLoadingDisciplineRules,
              disciplineViolations, disciplineViolationsByTradeId, indeterminateDisciplineDayKey,
              isExpanded: isRightSidebarExpanded,
              setIsExpanded: setIsRightSidebarExpanded,
              setShowThemeSelector
            }} />
          </div>

          {/* RIGHT COLUMN — log-trade panel, only on the index route */}
          {isLogRoute && (
            <aside inert={!isRightSidebarExpanded} aria-hidden={!isRightSidebarExpanded} className={cn(
              'w-full shrink-0 overflow-hidden transition-all duration-300',
              isRightSidebarExpanded
                ? 'mb-6 block max-h-none opacity-100 min-[1440px]:mb-0 min-[1440px]:ml-6 min-[1440px]:w-[400px]'
                : 'pointer-events-none mb-0 block max-h-0 opacity-0 min-[1440px]:ml-0 min-[1440px]:w-0'
            )}>
              <div className={cn(
                'w-full transition-opacity duration-200 min-[1440px]:w-[400px]',
                isRightSidebarExpanded ? 'opacity-100' : 'opacity-0'
              )}>
                <DashboardRightSidebar
                  plan={plan}
                  isTrial={isTrial}
                  expiry={expiry}
                  isTrialExpired={computedIsTrialExpired}
                  isTrialActive={computedIsTrialActive}
                  trialTimeLeft={trialTimeLeft}
                  trades={displayedTrades}
                  journals={journals}
                  walletBalance={displayedWalletBalance}
                  setShowPricingModal={setShowPricingModal}
                  toast={toast}
                  openPortal={openPortal}
                  resetTrades={resetTrades}
                  updateBalance={updateBalance}
                  addTrade={addTrade}
                  isLoadingTrades={isLoadingTrades}
                  setShowThemeSelector={setShowThemeSelector}
                  isExpanded={isRightSidebarExpanded}
                  setIsExpanded={setIsRightSidebarExpanded}
                  // The log form's Setup picker and its discipline pre-submit
                  // check read these. They are props rather than a second pair
                  // of hooks so the form shares this layout's single catalog
                  // listener and single settings listener; omitting them does
                  // not fail loudly — it degrades to an empty picker and a rule
                  // check that can never fire — so they are passed here
                  // explicitly and asserted by a wiring test.
                  setups={setups}
                  resolveSetup={resolveSetup}
                  createSetup={createSetup}
                  archiveSetup={archiveSetup}
                  disciplineRules={disciplineRules}
                />
              </div>
            </aside>
          )}
        </div>

        {/* FOOTER */}
        <footer className="w-full border-t border-border px-4 pt-6 pb-32 md:py-6">
          <p className="text-center text-xs text-muted-foreground">
            Copyright © 2026 xaujournal. All rights reserved.
          </p>
        </footer>
      </SidebarInset>

      {/* MOBILE FLOATING ACTION BUTTON */}
      {isLogRoute && (
        <button
          type="button"
          onClick={() => setIsRightSidebarExpanded(!isRightSidebarExpanded)}
          className={cn(
            'fixed right-6 z-30 flex size-13 items-center justify-center rounded-xl border shadow-lg transition-all duration-200 md:hidden',
            isVisible ? 'bottom-24' : 'bottom-6',
            isRightSidebarExpanded
              ? 'border-destructive/20 bg-destructive/10 text-destructive'
              : 'border-transparent bg-primary text-primary-foreground'
          )}
          aria-label={isRightSidebarExpanded ? 'Close trade form' : 'New trade'}
        >
          {isRightSidebarExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          )}
        </button>
      )}

      {/* MOBILE BOTTOM NAV */}
      <FloatingDockNavigation items={mobileNavigation} visible={isVisible} />

      <WalletTopUpDialog open={walletTopUpOpen} onOpenChange={setWalletTopUpOpen} />

      {/* ACCENT PICKER */}
      <AppDialog
        open={showThemeSelector}
        onOpenChange={setShowThemeSelector}
        title="Choose accent"
        description="Recolors the dashboard only. Green and red stay reserved for P&L."
        size="sm"
      >
        <div className="flex flex-col gap-1.5">
          {ACCENT_TEMPLATES.map((t) => {
            const selected = currentTemplate === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTemplate(t.id);
                  toast(`Accent changed to ${t.name}`, 'success');
                }}
                className={cn(
                  `theme-${t.id} flex w-full items-center gap-3 rounded-md border p-2.5 text-left transition-colors`,
                  selected ? 'border-primary bg-muted/50' : 'border-border hover:bg-muted'
                )}
              >
                <span className="size-2 shrink-0 rounded-sm bg-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-foreground">{t.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t.desc}</span>
                </span>
                {selected && <span className="text-xs text-muted-foreground">Selected</span>}
              </button>
            );
          })}
        </div>
      </AppDialog>
    </SidebarProvider>
  );
}
