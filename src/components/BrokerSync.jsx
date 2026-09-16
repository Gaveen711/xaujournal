// src/components/BrokerSync.jsx
// Broker Sync Terminal — MT4/MT5 broker login and trade import via MetaApi.
// (Formerly EASetup, from the retired EA-script sync path.)

import { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useSessionBrokerAccounts } from '../app/di/AuthenticatedSessionContext.jsx';
import { auth } from '../firebase';
// connectBrokerCallable and syncBrokerTradesCallable removed in favor of Hono useBrokerAccounts hook
import { getFriendlyErrorMessage } from '../lib/errorUtils';
import { isPaidPlan } from '../lib/entitlements.js';
// House currency formatting (em dash for missing values, no '$NaN') — the
// local Intl wrapper this file used to define broke both rules.
import { formatCurrency } from '../lib/tradeUtils';
import { useToast } from './ToastContext';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  Lightning,
  LightningFill,
  LockFill,
  ShieldLockFill,
  CloudDownload,
  Trash2Fill,
  CheckCircleFill,
  ExclamationCircleFill,
  ClockFill,
  ArrowClockwise,
  EyeFill,
  EyeSlashFill,
  PlusCircleFill,
  ExclamationTriangleFill,
  ChevronDown,
  Search,
  Wifi,
  Wallet2,
  Activity,
  ShieldCheck,
  X,
  Globe,
  Database,
  GearFill,
} from 'react-bootstrap-icons';

import {
  BROKERS,
  BROKER_CARD_STYLES,
  BROKER_PRESETS,
  resolveDefaultServer,
  POPULAR_BROKER_IDS,
  BROKER_CATALOG_FILTERS,
  getBrokerLogoUrl,
} from '../data/brokerCatalog.js';

function BrokerLogo({ preset, className = 'w-10 h-10 rounded-2xl', imageClassName = 'w-6 h-6' }) {
  const [hasImageError, setHasImageError] = useState(false);
  const logoUrl = !hasImageError ? getBrokerLogoUrl(preset) : '';

  return (
    <div className={`${className} border flex items-center justify-center shrink-0 overflow-hidden bg-white/80 dark:bg-white/5 ${preset.badgeBg}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${preset.name} logo`}
          className={`${imageClassName} object-contain opacity-100 saturate-150 contrast-105 mix-blend-normal`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span className={`text-[11px] font-black ${preset.accentColor}`}>{preset.iconText}</span>
      )}
    </div>
  );
}

function PlatformMark({ platform, className = 'h-4 w-4' }) {
  const src = platform === 'mt5' ? '/mt5.svg' : '/mt4.svg';
  const label = platform === 'mt5' ? 'MetaTrader 5' : 'MetaTrader 4';

  return <img src={src} alt={label} className={`${className} object-contain`} width="96" height="96" loading="lazy" />;
}
function FieldError({ id, children }) {
  return (
    <div id={id} className="flex items-start gap-2 text-[11px] font-bold leading-relaxed text-loss">
      <ExclamationCircleFill className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function BrokerSync() {
  const {
    plan = 'free',
    setShowPricingModal: onUpgrade,
    trades = [],
    walletBalance = 0
  } = useOutletContext();
  
  const toast = useToast();
  const { accounts, addAccount, syncAccount, removeAccount } = useSessionBrokerAccounts();

  // Platform selection (used in modals)
  const [selectedPlatform, setSelectedPlatform] = useState('mt4'); 

  // Modals state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [connectingPreset, setConnectingPreset] = useState(null);

  // Form state
  const [serverName, setServerName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [brokerSearch, setBrokerSearch] = useState('');
  const [connectErrors, setConnectErrors] = useState({});
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilter, setCatalogFilter] = useState('all');
  const [showAllBrokers, setShowAllBrokers] = useState(false);
  const dropdownRef = useRef(null);

  // Custom interactive sync settings (retained inside manage modal)
  const [syncInterval, setSyncInterval] = useState('500ms');
  const [permissions, setPermissions] = useState(() => {
    try {
      const user = auth.currentUser;
      const userKey = user ? `xau-sync-permissions-${user.uid}` : null;
      const saved = userKey ? localStorage.getItem(userKey) : localStorage.getItem('xau-sync-permissions-current');
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

  useEffect(() => {
    try {
      localStorage.setItem('xau-sync-permissions-current', JSON.stringify(permissions));
      const user = auth.currentUser;
      if (user) {
        localStorage.setItem(`xau-sync-permissions-${user.uid}`, JSON.stringify(permissions));
      }
      window.dispatchEvent(new Event('xau-permissions-changed'));
    } catch (e) {
      console.error(e);
    }
  }, [permissions]);

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [globalSyncing, setGlobalSyncing] = useState(false);
  // Two-step disconnect confirmation lives in the modal (window.confirm is
  // blocked in some embedded/desktop contexts, which made the button a no-op)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!isManageModalOpen) setConfirmDisconnect(false);
  }, [isManageModalOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Plan gate. `plan` arrives from useSubscription already expiry-validated
  // (lapsed accounts are published as 'free'), so the string check is the
  // whole check. The old inline version here had a dead clause that let an
  // expired Pro plan through.
  const isGrace = plan === 'grace';
  const isSyncAllowed = isPaidPlan(plan);

  // Active Connection Mapping
  const activeAccount = accounts[0] || null;
  const isAccountConnected = !!activeAccount;

  let activeCardId = null;
  if (activeAccount) {
    const serverUpper = activeAccount.server.toUpperCase();
    const matchedPreset = BROKER_PRESETS.find(p => p.serverFilter && serverUpper.includes(p.serverFilter.toUpperCase()));
    if (matchedPreset) {
      activeCardId = matchedPreset.id;
    } else {
      activeCardId = 'custom';
    }
  }

  // Calculate stats from trades & walletBalance
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const currentBalance = (walletBalance || 0) + totalPnl;
  const currentEquity = currentBalance; 

  const formatRelativeTime = (timeStr) => {
    if (!timeStr) return 'Never synced';
    const diffMs = currentTime - new Date(timeStr).getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hr ago';
    return `${diffHours} hrs ago`;
  };

  const getSyncStatusInfo = (account) => {
    if (!account) return { status: 'disconnected', label: 'Offline', color: 'text-muted-foreground', dotBg: 'bg-muted-foreground/30', badgeBg: 'bg-muted/10 border-border/30' };
    
    if (account.requiresReconnect) {
      return {
        status: 'reconnect',
        label: 'Reconnect required',
        color: 'text-primary',
        dotBg: 'bg-amber-500',
        badgeBg: 'bg-amber-500/15 border-amber-500/20'
      };
    }
    if (account.lastSyncStatus === 'failed') {
      return {
        status: 'failed',
        label: 'Disconnected',
        color: 'text-loss',
        dotBg: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
        badgeBg: 'bg-rose-500/15 border-rose-500/20'
      };
    }
    
    if (account.lastSyncTime) {
      const elapsedMinutes = (currentTime - new Date(account.lastSyncTime).getTime()) / 60000;
      if (elapsedMinutes > 5) {
        return {
          status: 'delayed',
          label: 'Sync Delayed',
          color: 'text-primary',
          dotBg: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
          badgeBg: 'bg-amber-500/15 border-amber-500/20'
        };
      }
    }
    
    return {
      status: 'active',
      label: 'Connected',
      color: 'text-win',
      dotBg: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
      badgeBg: 'bg-emerald-500/15 border-emerald-500/20'
    };
  };

  const handleOpenConnect = (preset) => {
    if (preset.comingSoon) {
      toast(`${preset.name} ${preset.platformLabel || 'integration'} is coming soon for XAUUSD sync.`, 'info');
      return;
    }
    const nextPlatform = preset.platform || preset.platforms?.[0] || 'mt4';
    setConnectingPreset(preset);
    setSelectedPlatform(nextPlatform);
    setServerName(resolveDefaultServer(preset, nextPlatform));
    setLogin('');
    setPassword('');
    setConnectErrors({});
    setShowPassword(false);
    setIsConnectModalOpen(true);
  };

  const clearConnectError = (field) => {
    setConnectErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateConnectForm = () => {
    const nextErrors = {};
    if (!serverName.trim()) nextErrors.serverName = 'Choose a server preset or enter your broker server name.';
    if (!login.trim()) nextErrors.login = 'Enter your broker login account number.';
    if (!password) nextErrors.password = 'Enter your broker password or investor password.';
    setConnectErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  async function handleConnect(e) {
    e.preventDefault();
    if (!validateConnectForm()) return;
    setConnecting(true);
    try {
      // Disconnect existing if any
      if (activeAccount) {
        await removeAccount(activeAccount.id);
      }

      const cleanServer = serverName.trim();
      const cleanLogin = login.trim();
      const friendlyName = `${cleanServer} · ${cleanLogin}`;
      
      const result = await addAccount(
        cleanLogin,
        password,
        cleanServer,
        selectedPlatform,
        friendlyName
      );
      toast(result.message || 'Broker connected successfully!', 'success');
      setIsConnectModalOpen(false);
      setLogin('');
      setPassword('');
      setServerName('');
      setConnectErrors({});
    } catch (err) {
      toast(getFriendlyErrorMessage(err), 'error');
    } finally {
      setConnecting(false);
    }
  }

  async function handleRemove(accountId) {
    setDisconnecting(true);
    try {
      const result = await removeAccount(accountId);
      toast(result?.message || 'Account disconnected.', 'success');
      setIsManageModalOpen(false);
    } catch (err) {
      toast(getFriendlyErrorMessage(err), 'error');
    } finally {
      setDisconnecting(false);
      setConfirmDisconnect(false);
    }
  }

  async function handleManualSync() {
    if (!activeAccount) return;
    setGlobalSyncing(true);
    try {
      const result = await syncAccount(activeAccount.id);
      toast(result.message || 'Broker synchronization completed.', 'success');
    } catch (err) {
      toast(getFriendlyErrorMessage(err), 'error');
    } finally {
      setGlobalSyncing(false);
    }
  }

  // Pro Upgrade Gate
  if (!isSyncAllowed) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground uppercase tracking-tight">Broker Sync Terminal</h1>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Connect your MT4 / MT5 broker account.</p>
        </header>
        <div className="max-w-lg mx-auto mt-16 card-premium p-10 flex flex-col items-center text-center gap-5 animate-in zoom-in-95 duration-500">
          <div className="w-16 h-16 rounded-2xl bg-muted border border-border/40 flex items-center justify-center">
            <LockFill className="w-7 h-7 text-foreground/30" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground/80">Pro Feature</h3>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed max-w-xs">
              Broker Sync is available on the Pro plan. Upgrade to connect your MT4/MT5 account and automatically sync trades.
            </p>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="btn-primary flex items-center gap-2 text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all"
            >
              <Lightning className="w-4 h-4" />
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentBrokers = selectedPlatform ? (BROKERS[selectedPlatform] || []) : [];
  const serverFilter = connectingPreset?.serverFilter?.toLowerCase();
  const filteredPresets = serverFilter
    ? currentBrokers.filter(b => `${b.label} ${b.server}`.toLowerCase().includes(serverFilter))
    : currentBrokers;
  const displayedBrokers = filteredPresets.filter(b => `${b.label} ${b.server}`.toLowerCase().includes(brokerSearch.toLowerCase()));
  const normalizedCatalogSearch = catalogSearch.trim().toLowerCase();
  const filteredBrokerPresets = BROKER_PRESETS.filter((preset) => {
    const matchesSearch = !normalizedCatalogSearch || [
      preset.name,
      preset.logoText,
      preset.watermarkText,
      preset.serverFilter,
      preset.platformLabel,
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedCatalogSearch);

    const matchesFilter =
      catalogFilter === 'all'
      || (catalogFilter === 'soon' && preset.comingSoon)
      || (catalogFilter !== 'soon' && !preset.comingSoon && (preset.platform === catalogFilter || preset.platforms?.includes(catalogFilter)));

    return matchesSearch && matchesFilter;
  });
  const shouldLimitBrokerGrid = !showAllBrokers && !normalizedCatalogSearch && catalogFilter === 'all';
  const visibleBrokerPresets = shouldLimitBrokerGrid
    ? filteredBrokerPresets.filter((preset) => POPULAR_BROKER_IDS.has(preset.id)).slice(0, 10)
    : filteredBrokerPresets;
  const hiddenBrokerCount = Math.max(filteredBrokerPresets.length - visibleBrokerPresets.length, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header Section */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            Sync <span className="text-foreground">Hub</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider break-words">
            Manage your secure broker connections & integrations
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-h-9 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-win text-[10px] font-black uppercase tracking-wider">
            <ShieldLockFill className="w-3.5 h-3.5" />
            Vault Secured
          </div>
          <button
            onClick={handleManualSync}
            disabled={!isAccountConnected || globalSyncing}
            className={`btn-primary min-h-11 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider px-4 py-2.5 rounded-full shadow-lg ${
              (!isAccountConnected || globalSyncing) ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.03] active:scale-95 transition-all'
            }`}
          >
            <ArrowClockwise className={`w-3.5 h-3.5 ${globalSyncing ? 'animate-spin' : ''}`} />
            {globalSyncing ? 'Syncing...' : 'Sync All'}
          </button>
        </div>
      </header>

      {/* Grace period warning */}
      {isGrace && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 max-w-none animate-in slide-in-from-top-2 duration-500">
          <ExclamationTriangleFill className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-primary">Grace Period Active</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
              Your Pro subscription has lapsed. Broker sync still works during the grace period. Renew to keep syncing.
            </p>
            {onUpgrade && (
              <button onClick={onUpgrade} className="mt-2 min-h-11 rounded-lg pr-3 text-[10px] font-black uppercase tracking-widest text-primary underline underline-offset-2 hover:text-foreground transition-colors">
                Renew Pro →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Summary Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Connections */}
        <div className="card-premium p-4 flex items-center gap-4 bg-card/20 backdrop-blur-md border border-border/20">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-win shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-wider leading-tight break-words">Active Connections</div>
            <div className="text-lg font-black text-foreground mt-0.5">
              {isAccountConnected ? '1 / 6' : '0 / 6'}
            </div>
          </div>
        </div>

        {/* Total Balance */}
        <div className="card-premium p-4 flex items-center gap-4 bg-card/20 backdrop-blur-md border border-border/20">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-primary shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-wider leading-tight break-words">Total Balance</div>
            <div className="text-lg font-black text-foreground mt-0.5">
              {isAccountConnected ? formatCurrency(currentBalance) : '—'}
            </div>
          </div>
        </div>

        {/* Total Equity */}
        <div className="card-premium p-4 flex items-center gap-4 bg-card/20 backdrop-blur-md border border-border/20">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-wider leading-tight break-words">Total Equity</div>
            <div className="text-lg font-black text-foreground mt-0.5">
              {isAccountConnected ? formatCurrency(currentEquity) : '—'}
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card-premium p-4 flex items-center gap-4 bg-card/20 backdrop-blur-md border border-border/20">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-wider leading-tight break-words">Security</div>
            <div className="text-lg font-black text-win mt-0.5 flex items-center gap-1.5">
              Encrypted
            </div>
          </div>
        </div>
      </div>

      {/* Strict Client-Side Security Info Banner */}
      <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-primary/5 border border-primary/10 max-w-none">
        <ShieldLockFill className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-primary">Strict Client-Side Security</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Your broker credentials are stored only in this browser on this device and are never saved in our database. When you start a sync, they are sent over an encrypted HTTPS/TLS connection, used only for that request, and the temporary broker-provider connection is removed immediately afterward. Because storage is local, you will need to re-configure your credentials if you switch devices or browsers.
          </p>
        </div>
      </div>

      {/* Broker Finder */}
      <section className="card-premium p-4 sm:p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Broker Library</p>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground">Find Your Connection</h2>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1 max-w-2xl">
              Showing the most-used XAUUSD connections first. Search or filter to reveal the full MT4/MT5 server catalog.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 xl:min-w-[560px]">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                value={catalogSearch}
                onChange={(e) => {
                  setCatalogSearch(e.target.value);
                  setShowAllBrokers(false);
                }}
                placeholder="Search broker..."
                className="input-premium h-11 w-full pl-10 pr-3 text-sm font-bold border-primary/15 focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-1 rounded-2xl bg-background/45 border border-border/25 p-1 overflow-x-auto scrollbar-none">
              {BROKER_CATALOG_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => {
                    setCatalogFilter(filter.id);
                    setShowAllBrokers(false);
                  }}
                  className={`min-h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                    catalogFilter === filter.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-background/35 border border-border/20 px-3.5 py-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Showing <span className="text-foreground">{visibleBrokerPresets.length}</span> of <span className="text-foreground">{filteredBrokerPresets.length}</span> connections
          </div>
          {shouldLimitBrokerGrid && hiddenBrokerCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllBrokers(true)}
              className="min-h-10 px-4 rounded-full border border-primary/20 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider hover:bg-primary/15"
            >
              Show All Brokers ({hiddenBrokerCount} More)
            </button>
          )}
          {(normalizedCatalogSearch || catalogFilter !== 'all' || showAllBrokers) && (
            <button
              type="button"
              onClick={() => {
                setCatalogSearch('');
                setCatalogFilter('all');
                setShowAllBrokers(false);
              }}
              className="min-h-10 px-4 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 text-[10px] font-black uppercase tracking-wider"
            >
              Reset View
            </button>
          )}
        </div>
      </section>

      {/* Grid of Branded Broker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visibleBrokerPresets.map((preset) => {
          const isCurrentActive = isAccountConnected && activeCardId === preset.id;
          const platformLabel = preset.platformLabel || (preset.platforms?.length > 1 ? 'MetaTrader 4/5' : (preset.platform === 'mt5' ? 'MetaTrader 5' : 'MetaTrader 4'));
          
          return (
            <div
              key={preset.id}
              className={`group relative card-premium p-5 flex flex-col justify-between min-h-[220px] transition-all duration-300 bg-gradient-to-br ${
                isCurrentActive 
                  ? preset.brandingColor + ' border-primary/40 shadow-xl scale-[1.01]' 
                  : 'from-card/30 to-card/5 hover:bg-card/20 border border-border/20'
              }`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start gap-3 min-w-0">
                <div className="flex items-start gap-3 min-w-0">
                  <BrokerLogo preset={preset} />
                  <div className="space-y-1 min-w-0">
                    <span className="flex items-center gap-1.5 text-[9px] font-black tracking-widest text-muted-foreground/80 uppercase">
                      {!preset.comingSoon && <PlatformMark platform={preset.platform} className="h-3.5 w-3.5" />}
                      {platformLabel}
                    </span>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug break-words">
                      {preset.name}
                    </h3>
                    {isCurrentActive && activeAccount && (
                      <span className="text-[11px] text-muted-foreground font-semibold block">
                        #{activeAccount.login}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex flex-wrap justify-end items-center gap-2 shrink-0 max-w-[45%]">
                  {isCurrentActive && !activeAccount?.requiresReconnect && activeAccount?.lastSyncStatus === 'success' && (
                    <span className="text-[10px] text-win font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </span>
                  )}
                  {isCurrentActive && activeAccount?.requiresReconnect && (
                    <span className="text-[10px] text-primary font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      Reconnect required
                    </span>
                  )}
                  {isCurrentActive && activeAccount?.lastSyncStatus === 'failed' && (
                    <span className="text-[10px] text-loss font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      Error
                    </span>
                  )}
                  {preset.comingSoon && (
                    <span className="text-[9px] text-primary font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                  )}
                  {!isCurrentActive && !preset.comingSoon && (
                    <span className="text-[9px] text-muted-foreground/80 font-bold bg-muted/10 border border-border/10 px-2 py-0.5 rounded-full">
                      Offline
                    </span>
                  )}
                </div>
              </div>

              {/* Watermark Logo Background */}
              <div className={`absolute right-4 bottom-16 opacity-[0.04] group-hover:opacity-[0.08] pointer-events-none select-none text-4xl sm:text-5xl font-black tracking-normal transition-opacity duration-300 ${preset.accentColor}`}>
                {preset.watermarkText}
              </div>
              <div className={`absolute -right-6 -bottom-7 w-24 h-24 rounded-full border pointer-events-none select-none opacity-[0.06] group-hover:opacity-[0.1] transition-opacity duration-300 ${preset.badgeBg}`} />

              {/* Content Metrics */}
              {isCurrentActive ? (
                <div className="grid grid-cols-3 gap-2 py-4 my-2 border-y border-border/10 bg-black/10 rounded-xl p-2.5">
                  <div className="text-center">
                    <div className="text-[9px] font-black uppercase text-muted-foreground">Balance</div>
                    <div className="text-xs font-bold mt-0.5 text-foreground">{formatCurrency(currentBalance)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-black uppercase text-muted-foreground">Equity</div>
                    <div className="text-xs font-bold mt-0.5 text-foreground">{formatCurrency(currentEquity)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-black uppercase text-muted-foreground">Trades</div>
                    <div className="text-xs font-bold mt-0.5 text-primary">{activeAccount?.tradeCount || trades.length}</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 py-4 text-xs font-semibold text-muted-foreground/75">
                  {preset.comingSoon ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground/40" />
                        <span>{preset.connectionHint || 'API integration'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ClockFill className="w-3.5 h-3.5 text-muted-foreground/40" />
                        <span>{preset.statusHint || 'Coming soon'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground/40" />
                        <span>—</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ClockFill className="w-3.5 h-3.5 text-muted-foreground/40" />
                        <span>Never synced</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="flex flex-wrap justify-between items-center gap-2 mt-3 pt-3 border-t border-border/10">
                <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1 min-w-0">
                  {isCurrentActive && activeAccount ? (
                    <>
                      <ClockFill className="w-3 h-3" />
                      {formatRelativeTime(activeAccount.lastSyncTime)}
                    </>
                  ) : (
                    preset.comingSoon ? (preset.footerLabel || 'Private API Gateway') : 'Sync Offline'
                  )}
                </span>
                
                {isCurrentActive ? (
                  <button
                    onClick={() => setIsManageModalOpen(true)}
                    className="min-h-11 flex items-center gap-1 px-3 py-1.5 rounded-full border border-emerald-500/30 text-win text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/10 active:scale-95 transition-all"
                  >
                    <GearFill className="w-3 h-3" />
                    Manage
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenConnect(preset)}
                    className={`min-h-11 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all ${
                      preset.comingSoon
                        ? 'border border-amber-500/30 bg-amber-500/10 text-primary hover:bg-amber-500/15'
                        : 'bg-amber-500 hover:bg-amber-600 text-black'
                    }`}
                  >
                    <Lightning className="w-3 h-3 fill-current" />
                    {preset.comingSoon ? 'Coming Soon' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {visibleBrokerPresets.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 card-premium p-8 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-foreground">No broker matches found</p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">Try another broker name or reset the broker library filters.</p>
          </div>
        )}
      </div>

      {/* Security Info Bar */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card/10 border border-border/15 max-w-none text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">
        <div className="flex items-center gap-2">
          <LockFill className="w-4 h-4 text-primary" />
          <span>AES-256 encrypted · Read-only API access · No fund withdrawal permissions</span>
        </div>
        <div className="flex items-center gap-1.5 text-win">
          <ShieldLockFill className="w-4 h-4" />
          Vault Secured
        </div>
      </footer>

      {/* ── CONNECTION MODAL OVERLAY ────────────────────────────────────── */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {isConnectModalOpen && connectingPreset && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsConnectModalOpen(false)}
            className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-background/55 dark:bg-black/55 backdrop-blur-xl p-3 sm:p-6 overflow-y-auto overscroll-contain"
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative mt-6 sm:mt-0 flex w-full max-w-lg max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[2rem] border border-border/40 bg-card/95 dark:bg-[#0b0c10]/95 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
            >
              {/* Header — the close button lives in the flow rather than
                  absolutely on top of the title, so a long broker name can no
                  longer slide under it and the row keeps the card's padding. */}
              <div className="flex items-start gap-3 border-b border-border/25 px-5 py-4 sm:px-7 sm:py-5">
                <BrokerLogo preset={connectingPreset} className="w-10 h-10 shrink-0 rounded-xl" imageClassName="w-6 h-6" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-bold leading-snug text-foreground">Connect {connectingPreset.name}</h3>
                  <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Secure transient connection</p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-none bg-transparent text-muted-foreground outline-none transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">

                {/* Account Overwrite Warning */}
                {isAccountConnected && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-primary text-[10px] font-semibold leading-relaxed">
                    <ExclamationTriangleFill className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold uppercase tracking-wider">Active connection will be replaced</p>
                      <p className="opacity-90 mt-0.5">
                        Connecting this account will disconnect your active broker ({activeAccount.server}). Your synced trade history will remain safe.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleConnect} noValidate className="space-y-5">
                  {/* Platform selection (MT4/5 toggle) */}
                  {(connectingPreset.platforms?.length > 1 || connectingPreset.id === 'custom') && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Platform Type</label>
                      <div className="grid grid-cols-2 gap-2 bg-background/50 p-1 border border-border/20 rounded-xl">
                        {(connectingPreset.platforms || ['mt4', 'mt5']).map((platform) => (
                          <button
                            key={platform}
                            type="button"
                            onClick={() => {
                              setSelectedPlatform(platform);
                              setServerName(resolveDefaultServer(connectingPreset, platform));
                              setBrokerSearch('');
                              setDropdownOpen(false);
                            }}
                            className={`min-h-11 px-2 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                              selectedPlatform === platform ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span className="flex items-center justify-center gap-2">
                              <PlatformMark platform={platform} className="h-5 w-5" />
                              {platform === 'mt5' ? 'MetaTrader 5' : 'MetaTrader 4'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Server Preset Search Dropdown */}
                  <div className="space-y-2 relative" ref={dropdownRef}>
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Server Name</label>
                      <span className="text-[9px] text-muted-foreground/60">(Preset or Custom)</span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Search server presets or type custom..."
                        value={serverName}
                        onChange={(e) => {
                          setServerName(e.target.value);
                          setDropdownOpen(true);
                          clearConnectError('serverName');
                        }}
                        onFocus={() => setDropdownOpen(true)}
                        className={`input-premium h-11 w-full text-sm font-bold pr-10 ${connectErrors.serverName ? 'border-red-500/50 focus:border-red-500' : 'border-primary/20 focus:border-primary'}`}
                        aria-invalid={Boolean(connectErrors.serverName)}
                        aria-describedby={connectErrors.serverName ? 'connect-server-error' : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-muted-foreground hover:text-foreground bg-transparent border-0 outline-none"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {dropdownOpen && (
                        <Motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-[110] top-full left-0 right-0 mt-2 p-1.5 rounded-2xl border border-border/45 bg-card/98 dark:bg-[#121318]/98 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.35)] backdrop-blur-2xl overflow-hidden flex flex-col max-h-36 sm:max-h-44"
                        >
                          {connectingPreset.id === 'custom' && (
                            <div className="p-2 border-b border-border/40 shrink-0">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                  type="text"
                                  placeholder="Type to filter presets..."
                                  value={brokerSearch}
                                  onChange={(e) => setBrokerSearch(e.target.value)}
                                  className="w-full bg-background border border-border/50 rounded-lg pl-9 pr-3 py-1.5 text-xs font-bold text-foreground focus:outline-none"
                                />
                              </div>
                            </div>
                          )}
                          <div className="overflow-y-auto custom-scrollbar p-1 flex-1">
                            {displayedBrokers.length > 0 ? (
                              displayedBrokers.map((b) => (
                                <button
                                  key={b.server}
                                  type="button"
                                  onClick={() => {
                                    setServerName(b.server);
                                    setDropdownOpen(false);
                                    setBrokerSearch('');
                                  }}
                                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-colors text-foreground/85 hover:bg-primary/10 hover:text-foreground border-none bg-transparent"
                                >
                                  <span className="block truncate">{b.label}</span>
                                  <span className="block truncate text-[10px] text-muted-foreground/65 mt-0.5">{b.server}</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-4 text-center text-xs font-bold text-muted-foreground">No presets. Press enter to use custom server.</div>
                            )}
                          </div>
                        </Motion.div>
                      )}
                    </AnimatePresence>
                    {connectErrors.serverName && <FieldError id="connect-server-error">{connectErrors.serverName}</FieldError>}
                  </div>

                  {/* Account Login */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Account Login</label>
                    <input
                      type="text"
                      placeholder="Your broker login account number"
                      value={login}
                      onChange={(e) => {
                        setLogin(e.target.value);
                        clearConnectError('login');
                      }}
                      className={`input-premium h-11 w-full text-sm font-bold ${connectErrors.login ? 'border-red-500/50 focus:border-red-500' : 'border-primary/20 focus:border-primary'}`}
                      aria-invalid={Boolean(connectErrors.login)}
                      aria-describedby={connectErrors.login ? 'connect-login-error' : undefined}
                    />
                    {connectErrors.login && <FieldError id="connect-login-error">{connectErrors.login}</FieldError>}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Password</label>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Your broker password (investor works)"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearConnectError('password');
                        }}
                        className={`input-premium h-11 w-full text-sm font-bold pr-11 ${connectErrors.password ? 'border-red-500/50 focus:border-red-500' : 'border-primary/20 focus:border-primary'}`}
                        aria-invalid={Boolean(connectErrors.password)}
                        aria-describedby={connectErrors.password ? 'connect-password-error' : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center text-foreground/40 hover:text-foreground/70 bg-transparent border-0 outline-none"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeSlashFill className="w-4 h-4" /> : <EyeFill className="w-4 h-4" />}
                      </button>
                    </div>
                    {connectErrors.password && <FieldError id="connect-password-error">{connectErrors.password}</FieldError>}
                  </div>

                  {Object.keys(connectErrors).length > 0 && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold leading-relaxed text-loss" role="alert">
                      <ExclamationCircleFill className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>Please complete the highlighted fields before connecting.</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={connecting}
                    className="w-full h-11 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-50 active:scale-[0.98] cursor-pointer mt-4"
                    style={{
                      background: connecting
                        ? 'linear-gradient(135deg, hsl(var(--primary) / 0.7), hsl(var(--primary-to) / 0.7))'
                        : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-to)))',
                      boxShadow: connecting ? 'none' : '0 0 20px hsl(var(--primary) / 0.35)',
                      // The dark themes set a near-black --primary-foreground
                      // precisely because their primary is a light lime/cyan;
                      // hardcoding white washed the label out to nothing there.
                      color: 'hsl(var(--primary-foreground))',
                      border: 'none',
                    }}
                  >
                    {connecting ? (
                      <>
                        <ArrowClockwise className="w-4 h-4 animate-spin" />
                        Connecting…
                      </>
                    ) : (
                      <>
                        <Lightning className="w-4 h-4 fill-current" />
                        Connect & Sync
                      </>
                    )}
                  </button>
                </form>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* ── CONNECTION MANAGE MODAL OVERLAY ────────────────────────────────── */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {isManageModalOpen && activeAccount && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsManageModalOpen(false)}
            className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-background/55 dark:bg-black/55 backdrop-blur-xl p-3 sm:p-6 overflow-y-auto overscroll-contain"
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative mt-6 sm:mt-0 w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-border/40 bg-card/95 dark:bg-[#0b0c10]/95 p-5 sm:p-7 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsManageModalOpen(false)}
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border-none bg-transparent text-muted-foreground outline-none transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-bold text-foreground">Manage Connection</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5 break-words pr-10">
                    {activeAccount.server} · {activeAccount.login}
                  </p>
                </div>

                {/* Details list */}
                <div className="space-y-3 bg-background/60 p-4 border border-border/20 rounded-2xl text-xs font-semibold text-muted-foreground">
                  <div className="flex justify-between gap-3">
                    <span>Broker Server</span>
                    <span className="text-foreground font-bold text-right break-all">{activeAccount.server}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Account Number</span>
                    <span className="text-foreground font-bold text-right break-all">{activeAccount.login}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Import Status</span>
                    <span className={`font-bold ${getSyncStatusInfo(activeAccount).color}`}>
                      {getSyncStatusInfo(activeAccount).label}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Last Sync</span>
                    <span className="text-foreground font-bold">
                      {activeAccount.lastSyncTime ? new Date(activeAccount.lastSyncTime).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Settings Toggles inside Manage Modal */}
                <div className="space-y-4 border-t border-border/20 pt-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">Data Permissions</h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-foreground">Read Positions</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">View open and closed positions</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPermissions({ ...permissions, readPositions: !permissions.readPositions })}
                        className={`w-11 h-7 shrink-0 rounded-full relative p-0.5 transition-colors duration-200 ease-in-out border-none outline-none focus:outline-none ${permissions.readPositions ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span className={`block w-6 h-6 rounded-full bg-white transition-transform duration-200 ease-in-out ${permissions.readPositions ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-foreground">Trade History</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Sync historical trade data</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPermissions({ ...permissions, tradeHistory: !permissions.tradeHistory })}
                        className={`w-11 h-7 shrink-0 rounded-full relative p-0.5 transition-colors duration-200 ease-in-out border-none outline-none focus:outline-none ${permissions.tradeHistory ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span className={`block w-6 h-6 rounded-full bg-white transition-transform duration-200 ease-in-out ${permissions.tradeHistory ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-foreground">Account Balance</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">View account balance and equity</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPermissions({ ...permissions, accountBalance: !permissions.accountBalance })}
                        className={`w-11 h-7 shrink-0 rounded-full relative p-0.5 transition-colors duration-200 ease-in-out border-none outline-none focus:outline-none ${permissions.accountBalance ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span className={`block w-6 h-6 rounded-full bg-white transition-transform duration-200 ease-in-out ${permissions.accountBalance ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sync Interval */}
                <div className="space-y-3 border-t border-border/20 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Sync Interval</label>
                  <div className="glass-tab-container flex gap-1 bg-background/50 border border-border/20 p-1 rounded-xl">
                    {['250ms', '500ms', '1s', '5s'].map((interval) => (
                      <button
                        key={interval}
                        type="button"
                        onClick={() => setSyncInterval(interval)}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold text-center ${
                          syncInterval === interval ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                        } border-none bg-transparent`}
                      >
                        {interval}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-border/20">
                  <button
                    type="button"
                    onClick={() => {
                      syncAccount(activeAccount.id);
                      toast('Manual sync triggered.', 'success');
                      setIsManageModalOpen(false);
                    }}
                    className="h-11 rounded-xl border border-border/40 hover:border-primary/50 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] bg-transparent text-foreground"
                  >
                    <ArrowClockwise className="w-3.5 h-3.5" />
                    Re-sync
                  </button>
                  <button
                    type="button"
                    disabled={disconnecting}
                    onClick={() => {
                      if (!confirmDisconnect) {
                        setConfirmDisconnect(true);
                        return;
                      }
                      handleRemove(activeAccount.id);
                    }}
                    className={`h-11 rounded-xl text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border-none disabled:opacity-60 disabled:pointer-events-none ${confirmDisconnect ? 'bg-rose-500 hover:bg-rose-400 ring-2 ring-rose-400/60' : 'bg-rose-600/90 hover:bg-rose-600'}`}
                  >
                    <Trash2Fill className="w-3.5 h-3.5" />
                    {disconnecting ? 'Disconnecting…' : confirmDisconnect ? 'Tap again to confirm' : 'Disconnect'}
                  </button>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
}





