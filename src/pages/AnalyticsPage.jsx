import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { formatCurrencyCompact, formatCurrency, formatSigned, formatSignedCompact, formatSignedNumber, pnlToneClass } from '../lib/tradeUtils';
import {
  ANALYTICS_VERSION,
  MIN_SESSION_INSIGHT_SAMPLE,
  MIN_SETUP_SAMPLE,
  SESSION_BUCKETS,
  deriveSessionStats,
  getTradeOutcome,
  getTradeSessionCode,
  getTradeSetupKey,
  getTradeStrategyTags,
  isTradeAnalyticsEligible,
  sessionAnalyticsDeltaForTrades,
  tradePnlValue,
} from '../lib/tradeAnalytics.js';
import { PRIMARY_SESSIONS, SESSION_LABELS, primarySessionForCode } from '../lib/sessionEngine.js';
import { seriesColor } from '../lib/chartTheme.js';
import { cn } from '../lib/utils';
import { costOfBrokenRules } from '../lib/disciplineRules.js';
import { DirectionCell } from '../components/app/DirectionCell';
import { Share } from 'react-bootstrap-icons';
import { useChartTheme } from '../hooks/useChartTheme';
import { StatCard } from '../components/app/StatCard';
import { SectionCard } from '../components/app/SectionCard';
import { SessionRail } from '../components/app/SessionRail';
import { EmptyState } from '../components/app/EmptyState';
import { DataTable } from '../components/app/DataTable';
import { ManageSetupsDialog } from '../components/app/ManageSetupsDialog';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// Pulls html2canvas (~48 kB gzip), and only ever renders behind an explicit
// Share click — so it must not sit in this route's chunk.
const ShareTradeModal = lazy(() =>
  import('../components/ShareTradeModal').then((m) => ({ default: m.ShareTradeModal })));

// The WEEKLY session series: the four primary sessions, in the engine's own
// east-to-west order. The value is an index into the shared categorical ramp,
// so the legend swatch and the bar it describes can never drift apart.
//
// The Sessions panel above deliberately does not reuse these: it reports every
// bucket the engine can produce — both overlaps, Off and Unknown included —
// and tones its bars by sign instead (§4.1).
const SESSION_SERIES = Object.fromEntries(PRIMARY_SESSIONS.map((name, index) => [name, index]));

const signedCompact = formatSignedCompact;

const chip = (text) => (
  <span className="inline-flex h-[18px] items-center rounded-sm border border-border px-1.5 font-mono text-[11px] text-muted-foreground">
    {text}
  </span>
);

const pnlCell = (value) => (
  <span className={pnlToneClass(value)}>
    {formatSigned(value)}
  </span>
);

/**
 * The two session buckets that are not a traded session: `Off` is timed but
 * outside every window (weekend-gap fills, off-hours instants), `Unknown` is
 * untimed. Three catch-alls ship this release and none is the other (R8) — the
 * setups table's `untagged` is a third. Both render muted and pinned last, and
 * their derived rates are suppressed: a win rate over "trades that belong to no
 * session" reads as a finding when it is an artifact of tagging.
 */
const CATCH_ALL_SESSIONS = Object.freeze(['Off', 'Unknown']);
const UNTAGGED_SETUP_KEY = 'untagged';

/** §4.4 "Cost of broken rules" — last 7 days. */
const COST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// "2h 18m" / "3h 05m" / "45m". Null hold (no entry+close pair) is '—', never 0m.
const formatHold = (ms) => {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return '—';
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`;
};

const formatR = (value) => (value === null || !Number.isFinite(value) ? '—' : `${formatSignedNumber(value, 1)}R`);

// deriveSessionStats returns a 0–1 fraction and leaves the rounding to us.
const formatPercent = (fraction, decimals = 0) =>
  (fraction === null || !Number.isFinite(fraction) ? '—' : `${(fraction * 100).toFixed(decimals)}%`);

/**
 * The footer insight — five templates, first match top-to-bottom, no randomness
 * and no model, so the same trades always produce the same sentence.
 *
 * `qualified` arrives already ranked by expectancy (ties by trade count) with
 * Off and Unknown excluded and every member at or above
 * MIN_SESSION_INSIGHT_SAMPLE, so the templates only choose a shape.
 */
const buildSessionInsight = (qualified) => {
  const perTrade = (row) => `${formatSigned(row.expectancy)}/trade`;
  if (!qualified.length) {
    return `No session has ${MIN_SESSION_INSIGHT_SAMPLE} tagged trades yet — treat the session read as provisional.`;
  }
  const best = qualified[0];
  const worst = qualified[qualified.length - 1];
  if (qualified.length === 1) {
    return `${best.name} is the only session with enough trades so far (${best.tradeCount}): ${perTrade(best)}.`;
  }
  if (best.expectancy > 0 && worst.expectancy < 0) {
    return `Your edge lives in ${best.name} (${perTrade(best)}); ${worst.name} gives it back (${perTrade(worst)}).`;
  }
  if (best.expectancy > 0) {
    return `Every session with enough trades is positive; ${best.name} leads at ${perTrade(best)}.`;
  }
  return `No session is positive yet; ${best.name} costs you least at ${perTrade(best)}.`;
};

// Plain text names, no glyphs and no swatches: SessionGlyph draws single-hub
// marks only, and there is no mark for an overlap, for Off, or for Unknown.
/**
 * The gutter a `padded={false}` SectionCard removes. Children that are not
 * full-bleed (rails, stat grids, charts) put it back so only the tables run to
 * the card's edge.
 */
const CARD_GUTTER = 'px-(--card-spacing)';

const SESSION_COLUMNS = [
  {
    id: 'session',
    header: 'Session',
    cell: (row) => (
      <span className={row.catchAll ? 'text-muted-foreground' : 'font-medium text-foreground'}>{row.name}</span>
    ),
  },
  { id: 'trades', header: 'Trades', numeric: true, cell: (row) => row.tradeCount },
  { id: 'winRate', header: 'Win rate', numeric: true, cell: (row) => (row.catchAll ? '—' : formatPercent(row.winRate)) },
  { id: 'expectancy', header: 'Expectancy', numeric: true, cell: (row) => (row.catchAll ? '—' : formatSigned(row.expectancy)) },
  { id: 'netR', header: 'Net R', numeric: true, cell: (row) => (row.catchAll ? '—' : formatR(row.netR)) },
  {
    id: 'hold',
    header: 'Avg hold',
    numeric: true,
    hideBelow: 'md',
    cell: (row) => (row.catchAll ? '—' : formatHold(row.avgHoldMs)),
  },
  { id: 'pnl', header: 'Net P&L', numeric: true, cell: (row) => pnlCell(row.netPnl) },
];

const SETUP_COLUMNS = [
  {
    id: 'setup',
    header: 'Setup',
    sortable: true,
    cell: (row) => (
      <span className="inline-flex items-center gap-1.5">
        <span className={row.untagged ? 'text-muted-foreground' : 'font-medium text-foreground'}>{row.name}</span>
        {row.lowSample ? chip('low sample') : null}
      </span>
    ),
  },
  { id: 'trades', header: 'Trades', numeric: true, sortable: true, cell: (row) => row.tradeCount },
  {
    id: 'winRate',
    header: 'Win rate',
    numeric: true,
    sortable: true,
    cell: (row) => (row.untagged ? '—' : formatPercent(row.winRate, 1)),
  },
  {
    id: 'avgWin',
    header: 'Avg win',
    numeric: true,
    hideBelow: 'md',
    sortable: true,
    cell: (row) => (row.untagged || !row.wins ? '—' : formatSigned(row.avgWin)),
  },
  {
    id: 'avgLoss',
    header: 'Avg loss',
    numeric: true,
    hideBelow: 'md',
    sortable: true,
    cell: (row) => (row.untagged || !row.losses ? '—' : formatSigned(row.avgLoss)),
  },
  {
    id: 'expectancy',
    header: 'Expectancy',
    numeric: true,
    sortable: true,
    // Muted, not hidden and never blurred: the number is real, the sample is
    // just too thin to act on. The chip carries that message; the tone repeats it.
    cell: (row) => (
      row.untagged
        ? '—'
        : <span className={row.lowSample ? 'text-muted-foreground' : undefined}>{formatSigned(row.expectancy)}</span>
    ),
  },
  { id: 'pnl', header: 'Net P&L', numeric: true, sortable: true, cell: (row) => pnlCell(row.netPnl) },
];

/** Sort keys for the setups table. Null ratios sort to the bottom, never as 0. */
const SETUP_SORT_VALUES = {
  setup: (row) => row.name.toLowerCase(),
  trades: (row) => row.tradeCount,
  winRate: (row) => (row.winRate === null ? -Infinity : row.winRate),
  avgWin: (row) => (row.wins ? row.avgWin : -Infinity),
  avgLoss: (row) => (row.losses ? row.avgLoss : -Infinity),
  expectancy: (row) => (row.expectancy === null ? -Infinity : row.expectancy),
  pnl: (row) => row.netPnl,
};

const DEFAULT_SETUP_SORT = { columnId: 'expectancy', direction: 'desc' };

// Direction is form + word, never green/red — those belong to P&L alone.
const signalColumns = (onShare) => [
  { id: 'date', header: 'Date', cell: (t) => <span className="text-muted-foreground">{t.date}</span> },
  {
    id: 'direction',
    header: 'Type',
    cell: (t) => <DirectionCell direction={t.direction} />,
  },
  {
    id: 'context',
    header: 'Context',
    hideBelow: 'md',
    cell: (t) => {
      const strategy = getTradeStrategyTags(t)[0];
      if (!t.session && !strategy) return '—';
      return (
        <span className="inline-flex items-center gap-1">
          {t.session ? chip(t.session) : null}
          {strategy ? chip(strategy) : null}
        </span>
      );
    },
  },
  { id: 'pnl', header: 'P&L', numeric: true, cell: (t) => pnlCell(tradePnlValue(t)) },
  {
    id: 'share',
    header: <span className="sr-only">Share</span>,
    align: 'end',
    cell: (t) => (
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Share trade from ${t.date}`}
        onClick={() => onShare(t)}
      >
        <Share aria-hidden="true" />
      </Button>
    ),
  },
];

const AnalyticsSkeleton = () => (
  <div className="flex flex-col gap-6">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
    <Skeleton className="h-64" />
  </div>
);

// Redaction, not blur: locked sections never put the real data in the DOM.
const LockedSection = ({ description, onUpgrade }) => (
  <EmptyState
    title="Unlock with Pro"
    description={description}
    action={
      <Button size="sm" onClick={onUpgrade}>
        Upgrade to Pro
      </Button>
    }
  />
);

export function AnalyticsPage() {
  const {
    trades, analytics, isLoadingTrades, isLoadingMore, hasMoreTrades, loadAllTrades, walletBalance,
    plan, isTrial, setShowPricingModal,
    setups, setupsById, renameSetup, mergeSetups, archiveSetup, deleteSetup,
    disciplineViolations, enabledRuleIds,
  } = useOutletContext();
  const isFree = (plan === 'basic' || plan === 'free') && !isTrial;
  const navigate = useNavigate();

  const [showExact, setShowExact] = useState({});
  const [sharingTrade, setSharingTrade] = useState(null);
  const [historyLoadError, setHistoryLoadError] = useState(null);
  const [setupSort, setSetupSort] = useState(DEFAULT_SETUP_SORT);
  const [manageSetupsOpen, setManageSetupsOpen] = useState(false);

  const setExact = useCallback((index, val) => {
    setShowExact(prev => ({ ...prev, [index]: val }));
  }, []);

  const hydrateAllTrades = useCallback(async () => {
    setHistoryLoadError(null);
    try {
      await loadAllTrades();
    } catch (error) {
      console.error('Failed to load complete analytics history:', error);
      setHistoryLoadError(error);
    }
  }, [loadAllTrades]);

  useEffect(() => {
    if (isLoadingTrades || !hasMoreTrades) return;
    void hydrateAllTrades();
  }, [hasMoreTrades, hydrateAllTrades, isLoadingTrades]);

  const stats = useMemo(() => {
    const tradesList = trades || [];
    const wins = tradesList.filter(t => getTradeOutcome(t) === 'WIN');
    const losses = tradesList.filter(t => getTradeOutcome(t) === 'LOSS');
    const hasAggregate = analytics?.version === ANALYTICS_VERSION && Number.isFinite(Number(analytics.tradeCount));
    const winsCount = hasAggregate ? Number(analytics.wins) || 0 : wins.length;
    const lossesCount = hasAggregate ? Number(analytics.losses) || 0 : losses.length;
    const totalCount = hasAggregate ? Number(analytics.tradeCount) || 0 : tradesList.length;
    const grossWin = hasAggregate ? Number(analytics.grossProfit) || 0 : wins.reduce((s, t) => s + tradePnlValue(t), 0);
    const grossLoss = hasAggregate ? Number(analytics.grossLoss) || 0 : Math.abs(losses.reduce((s, t) => s + tradePnlValue(t), 0));
    const avgWin = winsCount ? grossWin / winsCount : 0;
    const avgLoss = lossesCount ? -(grossLoss / lossesCount) : 0;
    const wr = totalCount ? winsCount / totalCount : 0;
    const expectancy = (wr * avgWin) + ((1 - wr) * avgLoss);
    const pf = grossLoss > 0 ? grossWin / grossLoss : null;

    let peak = walletBalance || 0, maxDD = 0, running = walletBalance || 0;
    const sortedTrades = [...tradesList].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const drawdownCurve = [0];
    const drawdownLabels = ['Start'];

    sortedTrades.forEach(t => {
      running += tradePnlValue(t);
      if (running > peak) peak = running;
      const dd = running - peak;
      if (Math.abs(dd) > maxDD) maxDD = Math.abs(dd);
      drawdownCurve.push(parseFloat(dd.toFixed(2)));
      drawdownLabels.push(t.date);
    });

    const PLAYBOOK_STRATEGIES = ['Breakout', 'SMC', 'ICT', 'Scalp', 'Swing', 'S/R'];
    const strategyDataMap = {};

    // Initialize standard playbook strategies
    PLAYBOOK_STRATEGIES.forEach(strat => {
      strategyDataMap[strat] = { pnl: 0, wins: 0, total: 0 };
    });

    tradesList.forEach(t => {
      const tags = getTradeStrategyTags(t);

      tags.forEach(tag => {
        if (!tag) return;
        const normTag = tag.trim().toLowerCase();

        // Match standard playbook strategy names (case-insensitive)
        const found = PLAYBOOK_STRATEGIES.find(strat => {
          const normStrat = strat.toLowerCase();
          return normTag === normStrat || normTag.includes(normStrat) || normStrat.includes(normTag);
        });

        const key = found || tag.trim();

        if (!strategyDataMap[key]) {
          strategyDataMap[key] = { pnl: 0, wins: 0, total: 0 };
        }
        strategyDataMap[key].pnl += tradePnlValue(t);
        strategyDataMap[key].total++;
        if (getTradeOutcome(t) === 'WIN') strategyDataMap[key].wins++;
      });
    });

    // 1. Sessions (§4.1) — rebuilt in memory from the hydrated trade list.
    //
    // The stored `sessionAnalytics` aggregate is deliberately NOT read here.
    // It is not on the outlet context, and wiring it in would buy nothing this
    // page cannot already do: the route refuses to render until `loadAllTrades`
    // has hydrated the complete history, so the rebuild runs over the same
    // population the aggregate summarizes. Nothing is written back either — a
    // plain `set` of a rebuilt aggregate clobbers the increments a concurrent
    // broker sync is applying, and that drift is version-matched, so the lazy
    // gate can never detect it and it never self-heals. A transaction that
    // re-read and rebased would be correct; computing in memory and writing
    // nothing is correct AND cheaper, so that is what this does.
    const sessionBuckets = sessionAnalyticsDeltaForTrades(tradesList);
    const sessionRows = SESSION_BUCKETS
      .map((bucket) => ({
        key: bucket,
        name: SESSION_LABELS[bucket] ?? bucket,
        catchAll: CATCH_ALL_SESSIONS.includes(bucket),
        ...deriveSessionStats(sessionBuckets[bucket]),
      }))
      .filter((row) => row.tradeCount > 0)
      // SESSION_BUCKETS already ends with Off then Unknown; the sort states the
      // pin explicitly so a future reorder of the enum cannot unpin them. Sort
      // is stable, so bucket order survives inside each group.
      .sort((a, b) => (a.catchAll === b.catchAll ? 0 : a.catchAll ? 1 : -1));

    const sessionTradeCount = sessionRows.reduce((sum, row) => sum + row.tradeCount, 0);
    const sessionTaggedCount = sessionRows.reduce(
      (sum, row) => (row.key === 'Unknown' ? sum : sum + row.tradeCount),
      0,
    );

    // Totals come off the raw buckets, not off the derived rows: averaging the
    // per-session averages would weight a 4-trade session like a 60-trade one.
    const sessionTotals = SESSION_BUCKETS.reduce((totals, bucket) => {
      const counters = sessionBuckets[bucket];
      if (!counters) return totals;
      totals.totalR += counters.rCount ? counters.totalR : 0;
      totals.rCount += counters.rCount;
      totals.holdMsTotal += counters.holdMsCount ? counters.holdMsTotal : 0;
      totals.holdMsCount += counters.holdMsCount;
      return totals;
    }, { totalR: 0, rCount: 0, holdMsTotal: 0, holdMsCount: 0 });

    const sessionNetR = sessionTotals.rCount ? sessionTotals.totalR : null;
    const sessionAvgHoldMs = sessionTotals.holdMsCount
      ? sessionTotals.holdMsTotal / sessionTotals.holdMsCount
      : null;

    // Off and Unknown never compete for "best": neither is a session a trader
    // can choose to trade, so ranking them would answer a question nobody asked.
    const rankedSessions = sessionRows
      .filter((row) => !row.catchAll && row.expectancy !== null)
      .sort((a, b) => (b.expectancy - a.expectancy) || (b.tradeCount - a.tradeCount));
    const bestSession = rankedSessions[0] || null;
    const sessionInsight = buildSessionInsight(
      rankedSessions.filter((row) => row.tradeCount >= MIN_SESSION_INSIGHT_SAMPLE),
    );

    // 2. Setups (§4.3) — one bucket per trade via getTradeSetupKey, so a
    // renamed setup keeps its history and a merged one reports under its target.
    // Eligible (closed) trades only: the caveat line promises closed trades and
    // a floating position would repaint expectancy on every price tick.
    const setupBuckets = new Map();
    tradesList.forEach((t) => {
      if (!isTradeAnalyticsEligible(t)) return;
      const key = getTradeSetupKey(t, setupsById);
      let bucket = setupBuckets.get(key);
      if (!bucket) {
        bucket = {
          tradeCount: 0, totalPnl: 0, wins: 0, losses: 0, breakEven: 0,
          grossProfit: 0, grossLoss: 0, totalR: 0, rCount: 0, holdMsTotal: 0, holdMsCount: 0,
          legacyLabel: null,
        };
        setupBuckets.set(key, bucket);
      }
      const pnl = tradePnlValue(t);
      const outcome = getTradeOutcome(t);
      bucket.tradeCount += 1;
      bucket.totalPnl += pnl;
      if (outcome === 'WIN') bucket.wins += 1;
      else if (outcome === 'LOSS') bucket.losses += 1;
      else bucket.breakEven += 1;
      if (pnl > 0) bucket.grossProfit += pnl;
      if (pnl < 0) bucket.grossLoss += Math.abs(pnl);
      if (!bucket.legacyLabel) bucket.legacyLabel = getTradeStrategyTags(t)[0] || null;
    });

    const setupRows = [...setupBuckets.entries()].map(([key, bucket]) => {
      const untagged = key === UNTAGGED_SETUP_KEY;
      // Own properties only — a setup id is a document id and 'constructor'
      // must not resolve to Object itself.
      const doc = !untagged && setupsById && Object.prototype.hasOwnProperty.call(setupsById, key)
        ? setupsById[key]
        : null;
      // An id kept on a trade whose setup was hard-deleted still owns its own
      // bucket (getTradeSetupKey never folds it into Untagged), so it needs a
      // name: the trade's own legacy tag, and only then an honest placeholder.
      const name = untagged ? 'Untagged' : (doc?.name || bucket.legacyLabel || 'Unknown setup');
      // Same ratios as the sessions table, from the same function, so the two
      // panels can never disagree about one trade's expectancy.
      const derived = deriveSessionStats(bucket);
      return {
        key,
        name,
        untagged,
        wins: bucket.wins,
        losses: bucket.losses,
        avgWin: bucket.wins ? bucket.grossProfit / bucket.wins : 0,
        avgLoss: bucket.losses ? -(bucket.grossLoss / bucket.losses) : 0,
        // Untagged is a catch-all, not a thin sample — it never wears the chip.
        lowSample: !untagged && derived.tradeCount < MIN_SETUP_SAMPLE,
        ...derived,
      };
    });

    // 3. Monthly P/L
    const monthlyPnlMap = {};
    tradesList.forEach(t => {
      if (!t.date) return;
      const dateObj = new Date(t.date);
      const monthName = dateObj.toLocaleString('en-US', { month: 'short' }); // "May", "Jun", etc.
      monthlyPnlMap[monthName] = (monthlyPnlMap[monthName] || 0) + tradePnlValue(t);
    });

    const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsWithTrades = new Set(Object.keys(monthlyPnlMap));
    const monthlyPnlLabels = monthsOrder.filter(m => monthsWithTrades.has(m));
    const monthlyPnlValues = monthlyPnlLabels.map(m => monthlyPnlMap[m] || 0);

    // 4. Weekly P&L by session — through the engine, like every other session
    // figure on the dashboard. This used to run its own string matcher over the
    // legacy free-text `session` field, which defaulted anything it did not
    // recognise (including a completely untagged trade) into Asia and quietly
    // inflated that series.
    const sessionWeeklyPnl = Object.fromEntries(
      PRIMARY_SESSIONS.map((name) => [
        name,
        { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 },
      ])
    );

    tradesList.forEach(t => {
      // Off-hours and untagged trades fold to null and are left out entirely
      // rather than being attributed to a desk that was shut.
      const session = primarySessionForCode(getTradeSessionCode(t));
      if (!session || !t.date) return;
      const dateObj = new Date(t.date);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = days[dateObj.getDay()];
      if (sessionWeeklyPnl[session][dayName] !== undefined) {
        sessionWeeklyPnl[session][dayName] += tradePnlValue(t);
      }
    });

    // 5. Performance by Strategy
    const strategyLabels = Object.keys(strategyDataMap).sort((a, b) => strategyDataMap[b].pnl - strategyDataMap[a].pnl);
    const strategyValues = strategyLabels.map(l => strategyDataMap[l].pnl);

    const totalPnl = hasAggregate ? Number(analytics.totalPnl) || 0 : tradesList.reduce((s, t) => s + tradePnlValue(t), 0);
    const currentWalletBalance = (walletBalance || 0) + totalPnl;
    const winRatePercent = totalCount ? (winsCount / totalCount * 100).toFixed(0) : 0;

    return {
      winsCount,
      lossesCount,
      totalCount,
      avgWin,
      avgLoss,
      expectancy,
      pf,
      sortedTrades,
      sessionRows,
      sessionTradeCount,
      sessionTaggedCount,
      sessionNetR,
      sessionRCount: sessionTotals.rCount,
      sessionAvgHoldMs,
      bestSession,
      sessionInsight,
      setupRows,
      monthlyPnlLabels,
      monthlyPnlValues,
      sessionWeeklyPnl,
      strategyLabels,
      strategyValues,
      currentWalletBalance,
      winRatePercent
    };
  }, [analytics, setupsById, trades, walletBalance]);

  const {
    winsCount,
    lossesCount,
    totalCount,
    avgWin,
    avgLoss,
    expectancy,
    pf,
    sortedTrades,
    sessionRows,
    sessionTradeCount,
    sessionTaggedCount,
    sessionNetR,
    sessionRCount,
    sessionAvgHoldMs,
    bestSession,
    sessionInsight,
    setupRows,
    monthlyPnlLabels,
    monthlyPnlValues,
    sessionWeeklyPnl,
    strategyLabels,
    strategyValues,
    currentWalletBalance,
    winRatePercent
  } = stats;

  // Read canvas colors after theme classes are committed.
  const chartColors = useChartTheme();

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 120,
    animation: { duration: 220 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: chartColors.tooltipBg,
        titleColor: chartColors.tooltipTitle,
        bodyColor: chartColors.tooltipBody,
        borderColor: chartColors.border,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 4,
        displayColors: false
      }
    },
    scales: {
      y: { grid: { color: chartColors.grid, drawBorder: false }, ticks: { color: chartColors.ticks, font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { color: chartColors.ticks, font: { size: 11 } } }
    }
  }), [chartColors]);

  const chartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Net P&L per session: sessions are plain x-axis categories and the only
    // encoding is the sign of the bar. No session hues, so no legend to read.
    const sessionNetValues = sessionRows.map((row) => parseFloat(row.netPnl.toFixed(2)));
    return {
      sessionNet: {
        labels: sessionRows.map((row) => row.name),
        datasets: [{
          label: 'Net P&L by session',
          data: sessionNetValues,
          backgroundColor: sessionNetValues.map(v => v >= 0 ? chartColors.win : chartColors.loss),
          borderColor: sessionNetValues.map(v => v >= 0 ? chartColors.winBorder : chartColors.lossBorder),
          borderWidth: 1.5,
          borderRadius: 2,
        }]
      },
      monthly: {
        labels: monthlyPnlLabels,
        datasets: [{
          label: 'Monthly P/L',
          data: monthlyPnlValues,
          backgroundColor: monthlyPnlValues.map(v => v >= 0 ? chartColors.win : chartColors.loss),
          borderColor: monthlyPnlValues.map(v => v >= 0 ? chartColors.winBorder : chartColors.lossBorder),
          borderWidth: 1.5,
          borderRadius: 2,
        }]
      },
      sessionWeekly: {
        labels: days,
        datasets: Object.entries(SESSION_SERIES).map(([session, slot]) => ({
          label: session,
          data: days.map(day => parseFloat(sessionWeeklyPnl[session][day].toFixed(2))),
          backgroundColor: seriesColor(chartColors, slot),
          borderRadius: 2,
          borderWidth: 0,
          barPercentage: 0.8,
          categoryPercentage: 0.8,
        }))
      },
      strategy: {
        labels: strategyLabels,
        // Each strategy gets its own slot on the ramp. One flat color across
        // every bar made neighbouring strategies read as one series and gave
        // the eye nothing to track a single strategy by.
        datasets: [{
          label: 'Strategy performance',
          data: strategyValues,
          backgroundColor: strategyValues.map((_, index) => seriesColor(chartColors, index, true)),
          borderColor: strategyValues.map((_, index) => seriesColor(chartColors, index)),
          borderWidth: 1.5,
          borderRadius: 2,
        }]
      }
    };
  }, [chartColors, monthlyPnlLabels, monthlyPnlValues, sessionRows, sessionWeeklyPnl, strategyLabels, strategyValues]);

  const recentSignals = useMemo(() => sortedTrades.slice(-5).reverse(), [sortedTrades]);

  const sessionStatCards = useMemo(() => [
    {
      id: 'bestSession',
      label: 'Best session',
      value: bestSession ? bestSession.name : '—',
      hint: bestSession
        ? `${formatPercent(bestSession.winRate)} WR · ${bestSession.tradeCount} ${bestSession.tradeCount === 1 ? 'trade' : 'trades'}`
        : 'No tagged sessions yet',
      tone: 'neutral',
    },
    {
      id: 'bestExpectancy',
      label: 'Best expectancy',
      value: bestSession ? `${formatSigned(bestSession.expectancy)} / trade` : '—',
      hint: bestSession ? `In ${bestSession.name}` : 'Needs a tagged session',
      tone: bestSession && bestSession.expectancy > 0
        ? 'positive'
        : bestSession && bestSession.expectancy < 0 ? 'negative' : 'neutral',
    },
    {
      id: 'netR',
      label: 'Session net R',
      value: formatR(sessionNetR),
      hint: `${sessionRCount} ${sessionRCount === 1 ? 'trade' : 'trades'} with SL set`,
      tone: sessionNetR === null ? 'neutral' : sessionNetR > 0 ? 'positive' : sessionNetR < 0 ? 'negative' : 'neutral',
    },
    {
      id: 'avgHold',
      label: 'Avg hold',
      value: formatHold(sessionAvgHoldMs),
      // Manual logs carry log time on both ends, so they contribute no hold.
      hint: 'Trades with real entry and close times',
      tone: 'neutral',
    },
  ], [bestSession, sessionAvgHoldMs, sessionNetR, sessionRCount]);

  // Two-tier sort (§4.3): the tier decides before the column does, so a
  // three-trade setup can never top the table on noise. Untagged is not a setup
  // and never ranks at all.
  const sortedSetupRows = useMemo(() => {
    const readValue = SETUP_SORT_VALUES[setupSort.columnId] || SETUP_SORT_VALUES.expectancy;
    const direction = setupSort.direction === 'asc' ? 1 : -1;
    return [...setupRows].sort((a, b) => {
      if (a.untagged !== b.untagged) return a.untagged ? 1 : -1;
      if (a.lowSample !== b.lowSample) return a.lowSample ? 1 : -1;
      const left = readValue(a);
      const right = readValue(b);
      if (typeof left === 'string' || typeof right === 'string') {
        return String(left).localeCompare(String(right)) * direction;
      }
      // Ties break on sample size, always descending: between two equal figures
      // the better-evidenced one is the more useful row.
      if (left === right) return b.tradeCount - a.tradeCount;
      return (left - right) * direction;
    });
  }, [setupRows, setupSort]);

  const activeSetupCount = useMemo(
    () => (setups || []).filter((setup) => !setup.archived && !setup.mergedInto).length,
    [setups],
  );

  const hasEnabledRules = (enabledRuleIds || []).length > 0;

  // `now` is a render-time snapshot by contract — the window has no upper bound
  // precisely so a stale snapshot cannot drop trades the subscription just
  // pushed in.
  const disciplineCost = useMemo(
    () => costOfBrokenRules(disciplineViolations, trades, { now: Date.now(), windowMs: COST_WINDOW_MS }),
    [disciplineViolations, trades],
  );

  const statCards = useMemo(() => [
    {
      index: 0,
      label: 'Wallet balance',
      value: showExact[0] ? formatCurrency(currentWalletBalance) : formatCurrencyCompact(currentWalletBalance),
      hint: 'Current liquidity',
      tone: 'neutral',
      interactive: true,
    },
    {
      index: 1,
      label: 'Win rate',
      value: `${winRatePercent}%`,
      hint: `${winsCount} successful`,
      tone: 'neutral',
      interactive: false,
    },
    {
      index: 2,
      label: 'Expectancy',
      value: totalCount ? (showExact[2] ? formatSigned(expectancy) : signedCompact(expectancy)) : '—',
      hint: 'Average per trade',
      tone: expectancy > 0 ? 'positive' : expectancy < 0 ? 'negative' : 'neutral',
      interactive: totalCount > 0,
    },
    {
      index: 3,
      label: 'Average win',
      value: winsCount ? (showExact[3] ? formatSigned(avgWin) : signedCompact(avgWin)) : '—',
      hint: `${winsCount} winners`,
      tone: winsCount && avgWin > 0 ? 'positive' : 'neutral',
      interactive: winsCount > 0,
    },
    {
      index: 4,
      label: 'Average loss',
      value: lossesCount ? (showExact[4] ? formatSigned(avgLoss) : signedCompact(avgLoss)) : '—',
      hint: `${lossesCount} losers`,
      tone: lossesCount && avgLoss < 0 ? 'negative' : 'neutral',
      interactive: lossesCount > 0,
    },
    {
      index: 5,
      label: 'Profit factor',
      value: pf !== null ? pf.toFixed(2) : '—',
      hint: 'Gross profit / gross loss',
      tone: 'neutral',
      interactive: false,
    },
  ], [avgLoss, avgWin, currentWalletBalance, expectancy, lossesCount, pf, showExact, totalCount, winRatePercent, winsCount]);

  const recentSignalColumns = signalColumns(setSharingTrade);

  if (historyLoadError && hasMoreTrades) return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-mono text-lg font-medium text-foreground">Analytics</h1>
      </header>
      <SectionCard
        surface
        title="Complete history could not be loaded"
        description="Analytics are hidden so a partial trade history is never presented as authoritative."
      >
        <Button size="sm" onClick={hydrateAllTrades}>
          Retry
        </Button>
      </SectionCard>
    </div>
  );

  if (isLoadingTrades || isLoadingMore || hasMoreTrades) return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-mono text-lg font-medium text-foreground">Analytics</h1>
      </header>
      <AnalyticsSkeleton />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-mono text-lg font-medium text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Where the edge holds and where it leaks.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((stat) => {
          const isLocked = isFree && stat.index > 1;
          return (
            <StatCard
              key={stat.index}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              tone={isLocked ? 'neutral' : stat.tone}
              interactive={stat.interactive}
              onRevealChange={stat.interactive ? (revealed) => setExact(stat.index, revealed) : undefined}
              locked={isLocked}
              onLockedActivate={() => setShowPricingModal(true)}
            />
          );
        })}
        {/*
          Discipline is a free-plan feature, so this card is rendered OUTSIDE
          the indexed KPI array above: the grid's lock reads `stat.index > 1`
          and would capture any seventh entry added to that list (§4.4).
          Hidden entirely while every rule is off — there is nothing to cost.
        */}
        {hasEnabledRules && (
          <StatCard
            label="Cost of broken rules"
            value={disciplineCost === 0 ? formatCurrency(0) : formatSigned(disciplineCost)}
            hint={disciplineCost === 0 ? 'No rule breaks this week' : 'Last 7 days'}
            tone={disciplineCost < 0 ? 'negative' : disciplineCost > 0 ? 'positive' : 'neutral'}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sessions */}
        <SectionCard
          surface
          className="lg:col-span-2"
          // Edge-to-edge so this table's left rule lines up with the Setups
          // table below it; the non-table children re-apply the card gutter.
          padded={isFree}
          title="Sessions"
          description="Where your edge trades. Auto-tagged from entry time."
          meta={isFree ? undefined : `${sessionTaggedCount} of ${sessionTradeCount} trades tagged`}
          footer={isFree ? undefined : (
            <p className="text-xs text-muted-foreground">{sessionInsight}</p>
          )}
        >
          {isFree ? (
            <LockedSection
              description="Per-session expectancy, net R, hold times, and where the edge leaks."
              onUpgrade={() => setShowPricingModal(true)}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {/* The signature mark, not a legend: it reports which desks are
                  open right now, never how the table's buckets are coloured. */}
              <div className={CARD_GUTTER}>
                <SessionRail />
              </div>

              <div className={cn(CARD_GUTTER, 'grid grid-cols-2 gap-3 md:grid-cols-4')}>
                {sessionStatCards.map((stat) => (
                  <StatCard
                    key={stat.id}
                    label={stat.label}
                    value={stat.value}
                    hint={stat.hint}
                    tone={stat.tone}
                  />
                ))}
              </div>

              <div className={cn(CARD_GUTTER, 'h-64')}>
                <Bar data={chartData.sessionNet} options={chartOptions} />
              </div>

              <DataTable
                caption="Per-session performance"
                columns={SESSION_COLUMNS}
                rows={sessionRows}
                getRowId={(row) => row.key}
                empty={
                  <EmptyState
                    title="No tagged sessions yet"
                    description="Log or sync a closed trade and the session read fills in."
                    className="py-8"
                  />
                }
              />
            </div>
          )}
        </SectionCard>

        {/* Setups */}
        <SectionCard
          surface
          className="lg:col-span-2"
          padded={isFree}
          title="Setups"
          description="Per-setup expectancy in USD per trade."
          meta={isFree ? undefined : `${activeSetupCount} ${activeSetupCount === 1 ? 'setup' : 'setups'}`}
          actions={isFree ? undefined : (
            <Button size="xs" variant="outline" onClick={() => setManageSetupsOpen(true)}>
              Manage
            </Button>
          )}
          footer={isFree ? undefined : (
            <p className="text-xs text-muted-foreground">
              Expectancy is shown for setups with at least {MIN_SETUP_SAMPLE} closed trades. Smaller
              samples are illustrative, not predictive.
            </p>
          )}
        >
          {isFree ? (
            <LockedSection
              description="Per-setup expectancy, win rate, and net P&L across your playbook."
              onUpgrade={() => setShowPricingModal(true)}
            />
          ) : (
            <>
              <DataTable
                caption="Performance by setup"
                columns={SETUP_COLUMNS}
                rows={sortedSetupRows}
                getRowId={(row) => row.key}
                sort={setupSort}
                onSortChange={setSetupSort}
                empty={
                  <EmptyState
                    title="No setups yet"
                    description="Tag trades with a setup to see per-setup expectancy."
                    className="py-8"
                  />
                }
              />
              {/* Deferred: mounted only once the user asks for it, so its own
                  hydration gate is what decides when counts and Delete unlock. */}
              {manageSetupsOpen && (
                <ManageSetupsDialog
                  open={manageSetupsOpen}
                  onOpenChange={setManageSetupsOpen}
                  setups={setups}
                  setupsById={setupsById}
                  trades={trades}
                  tradesHydrated={!isLoadingTrades && !hasMoreTrades}
                  onHydrate={loadAllTrades}
                  renameSetup={renameSetup}
                  mergeSetups={mergeSetups}
                  archiveSetup={archiveSetup}
                  deleteSetup={deleteSetup}
                />
              )}
            </>
          )}
        </SectionCard>

        {/* Monthly P&L */}
        <SectionCard surface title="Monthly P&L" description="Net result by calendar month.">
          <div className="h-64">
            <Bar data={chartData.monthly} options={chartOptions} />
          </div>
        </SectionCard>

        {/* Weekly session P&L — the legacy four-group view, unchanged. */}
        <SectionCard
          surface
          title="Weekly session P&L"
          description="Net P&L by weekday across the legacy session groups."
        >
          {isFree ? (
            <LockedSection
              description="Comparative session edge analysis and weekly performance."
              onUpgrade={() => setShowPricingModal(true)}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {Object.entries(SESSION_SERIES).map(([session, slot]) => (
                  <span
                    key={session}
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block size-2 rounded-sm"
                      style={{ backgroundColor: seriesColor(chartColors, slot) }}
                    />
                    {session}
                  </span>
                ))}
              </div>

              <div className="h-64">
                <Bar data={chartData.sessionWeekly} options={chartOptions} />
              </div>
            </div>
          )}
        </SectionCard>

        {/* Strategy performance */}
        <SectionCard
          surface
          className="lg:col-span-2"
          title="Strategy performance"
          description="Net P&L across playbook and custom strategies."
        >
          {isFree ? (
            <LockedSection
              description="Detailed reports and performance metrics across custom playbook setups."
              onUpgrade={() => setShowPricingModal(true)}
            />
          ) : (
            <div className="h-64">
              <Bar data={chartData.strategy} options={chartOptions} />
            </div>
          )}
        </SectionCard>
      </div>

      {/* Recent signals */}
      <SectionCard
        surface
        padded={false}
        title="Recent signals"
        meta={`${recentSignals.length} of ${sortedTrades.length}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/history')}>
            View all history
          </Button>
        }
      >
        <DataTable
          caption="Five most recent signals"
          columns={recentSignalColumns}
          rows={recentSignals}
          getRowId={(t, i) => t.id ?? `${t.date}-${i}`}
          empty={
            <EmptyState
              title="No recent signals yet"
              description="Log trades and the latest activity lands here."
              className="py-8"
            />
          }
        />
      </SectionCard>

      {sharingTrade && (
        <Suspense fallback={null}>
          <ShareTradeModal trade={sharingTrade} onClose={() => setSharingTrade(null)} />
        </Suspense>
      )}
    </div>
  );
}
