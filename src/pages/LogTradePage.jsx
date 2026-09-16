import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { formatCurrency, formatSigned, pnlToneClass } from '../lib/tradeUtils';
import { fetchSpotPrice } from '../lib/marketData';
import { costOfBrokenRules } from '../lib/disciplineRules.js';
// getTradeOutcome, not a bare `outcome` read: a broker-imported row stores no
// outcome and would otherwise be counted as a loss.
import { getTradeOutcome } from '../lib/tradeAnalytics.js';
import { DirectionCell } from '../components/app/DirectionCell';
import { useChartTheme } from '../hooks/useChartTheme';
import { LiveMarketWidget } from '../components/LiveMarketWidget';
import { StatCard } from '../components/app/StatCard';
import { SectionCard } from '../components/app/SectionCard';
import { EmptyState } from '../components/app/EmptyState';
import { DataTable } from '../components/app/DataTable';
import { StatusSquare } from '../components/app/StatusSquare';
import { Button } from '../components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Plus, X } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/** The cost StatCard's window (§4.4), matching AnalyticsPage's COST_WINDOW_MS. */
const DISCIPLINE_COST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const chip = (text) => (
  <span className="inline-flex h-[18px] items-center rounded-sm border border-border px-1.5 font-mono text-[11px] text-muted-foreground">
    {text}
  </span>
);

// Direction is form + word, never green/red — those belong to P&L alone.
const RECENT_TRADE_COLUMNS = [
  { id: 'date', header: 'Date', cell: (t) => <span className="text-muted-foreground">{t.date}</span> },
  { id: 'market', header: 'Market', cell: (t) => <span className="font-medium text-foreground">{t.market || 'GOLD'}</span> },
  {
    id: 'direction',
    header: 'Type',
    cell: (t) => <DirectionCell direction={t.direction} />,
  },
  {
    id: 'strategy',
    header: 'Strategy',
    hideBelow: 'md',
    cell: (t) => {
      const strategy = t.strategy || (t.strategies && t.strategies[0]) || t.setup;
      return strategy ? chip(strategy) : '—';
    },
  },
  { id: 'session', header: 'Session', hideBelow: 'lg', cell: (t) => (t.session ? chip(t.session) : '—') },
  { id: 'entry', header: 'Entry', numeric: true, cell: (t) => t.entry },
  { id: 'exit', header: 'Exit', numeric: true, cell: (t) => t.exit || '—' },
  { id: 'lots', header: 'Lots', numeric: true, cell: (t) => t.lots },
  {
    id: 'pnl',
    header: 'P&L',
    numeric: true,
    cell: (t) => (
      <span className={pnlToneClass(t.pnl)}>
        {formatSigned(t.pnl)}
      </span>
    ),
  },
];

export function LogTradePage() {
  const {
    trades, walletBalance, isExpanded, setIsExpanded,
    disciplineViolations, enabledRuleIds,
  } = useOutletContext();
  const [equityPeriod, setEquityPeriod] = useState('all');
  const [activeTab, setActiveTab] = useState('history');

  // Markets Open Status Badge logic
  const [isMarketOpen, setIsMarketOpen] = useState(true);

  useEffect(() => {
    const checkMarket = () => {
      const date = new Date();
      const day = date.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
      const hour = date.getUTCHours();
      let open = true;
      if (day === 0) {
        open = hour >= 22; // Sunday 22:00 GMT
      } else if (day === 5) {
        open = hour < 22;  // Friday 22:00 GMT
      } else if (day === 6) {
        open = false;      // Saturday closed
      }
      setIsMarketOpen(open);
    };

    checkMarket();
    const interval = setInterval(checkMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  // Shared live tickers state from LiveMarketWidget
  const [liveTickers, setLiveTickers] = useState(null);
  const [marketInterval, setMarketInterval] = useState('1m');

  // Gold Bias Gauge calculations using real-time market signals
  const biasPercentage = useMemo(() => {
    const ticker = liveTickers?.xauusd;
    const history = ticker?.history || [];
    const change = ticker?.change || 0;

    // Default base bias (neutral)
    let score = 50;

    // A. Daily Change Contribution (up to +/- 25%)
    // If gold is up 1%, add 20%. Clamped between -25% and +25%.
    score += Math.max(-25, Math.min(25, change * 20));

    // B. Moving Average Trend (up to +/- 15%)
    // Check if current price is above the average of recent prices.
    if (history.length > 1) {
      const avg = history.reduce((s, p) => s + p, 0) / history.length;
      const current = history[history.length - 1];
      if (current > avg) score += 15;
      else score -= 15;
    }

    // C. Momentum / RSI Proxy (up to +/- 15%)
    // Calculate simple relative strength from historical price fluctuations.
    if (history.length > 2) {
      let gains = 0;
      let losses = 0;
      for (let i = 1; i < history.length; i++) {
        const diff = history[i] - history[i - 1];
        if (diff > 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const rs = losses === 0 ? 100 : gains / losses;
      const rsi = 100 - (100 / (1 + rs));
      score += (rsi - 50) * 0.3; // Adds up to +15% or subtracts down to -15%
    }

    // D. User Trade Sentiment Contribution (up to +/- 15%)
    // Factor in the user's own long vs short ratio to personalize the bias.
    const buyTrades = trades.filter(t => {
      const dir = (t.direction || '').toUpperCase();
      return dir === 'BUY' || dir === 'LONG';
    });
    const totalDirectionalTrades = trades.filter(t => {
      const dir = (t.direction || '').toUpperCase();
      return dir === 'BUY' || dir === 'LONG' || dir === 'SELL' || dir === 'SHORT';
    });
    if (totalDirectionalTrades.length > 0) {
      const buyRatio = buyTrades.length / totalDirectionalTrades.length;
      score += (buyRatio - 0.5) * 30; // Adds up to +15% or subtracts down to -15%
    }

    // Clamp between 5% and 95% for realistic sentiment levels
    return Math.max(5, Math.min(95, Math.round(score)));
  }, [liveTickers, trades]);

  // Fallback state variables if LiveMarketWidget hasn't loaded yet
  const [goldPrice, setGoldPrice] = useState(2389.33);
  const [goldChange, setGoldChange] = useState(14.18);

  // A cold-start safety net, not a second feed. LiveMarketWidget already polls
  // /api/spot-price/XAU (4s ticks plus the slower real-price loop) and reports
  // through onTickersUpdate, and `goldPriceValue` below prefers that feed
  // unconditionally — so the moment a ticker lands, anything this poll fetches
  // can no longer reach the screen. marketData's in-flight dedupe does NOT
  // cover the overlap: it coalesces requests that are concurrent on one URL,
  // and a 30s poll meets a 4s poll only by accident. Keeping the interval alive
  // therefore bought a duplicate XAU request every 30s, forever, for a value
  // nothing reads. Stopping on the first live ticker leaves the net intact for
  // the case it exists for: the widget never reporting at all.
  const hasLiveGoldPrice = liveTickers?.xauusd?.price != null;

  useEffect(() => {
    if (hasLiveGoldPrice) return undefined;
    const controller = new AbortController();
    const fetchGoldPriceFallback = async () => {
      // Polling a background tab helps nobody and still costs a request.
      if (document.visibilityState === 'hidden') return;
      // Shared market-data layer: same proxy call, plus the Gold-API fallback.
      // Never throws; null covers abort, bad input, and total failure alike.
      const price = await fetchSpotPrice('XAU', { signal: controller.signal });
      if (price === null) return;
      setGoldPrice(price);
      const baselineClose = 2375.15;
      setGoldChange(Number((price - baselineClose).toFixed(2)));
    };

    fetchGoldPriceFallback();
    const interval = setInterval(fetchGoldPriceFallback, 30000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [hasLiveGoldPrice]);

  // Synchronized gold values (always preferred from liveTickers state)
  const goldPriceValue = liveTickers?.xauusd?.price || goldPrice;
  const goldChangeValue = useMemo(() => {
    const ticker = liveTickers?.xauusd;
    if (ticker) {
      if (ticker.history && ticker.history.length > 0) {
        // Absolute change is current price minus the start-of-day price (history[0])
        return ticker.price - ticker.history[0];
      }
      return ticker.price * (ticker.change / 100);
    }
    return goldChange;
  }, [liveTickers, goldChange]);

  const { needleX, needleY } = useMemo(() => {
    // 0% Bearish is at 210 degrees (bottom-left), 100% Bullish is at -30 degrees (bottom-right).
    // Angle = 210 - (percentage / 100) * 240
    const angle = 210 - (biasPercentage / 100) * 240;
    const rad = (angle * Math.PI) / 180;
    const r = 46; // needle length
    const pivotX = 100;
    const pivotY = 75;
    const x = pivotX + r * Math.cos(rad);
    const y = pivotY - r * Math.sin(rad);
    return { needleX: x, needleY: y };
  }, [biasPercentage]);

  // KPI calculations
  const mtdTrades = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return trades.filter(t => {
      if (!t.date) return false;
      const tDate = new Date(t.date);
      return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
    });
  }, [trades]);

  const mtdPnl = useMemo(() => {
    return mtdTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  }, [mtdTrades]);

  const lastMonthPnl = useMemo(() => {
    const now = new Date();
    let prevYear = now.getFullYear();
    let prevMonth = now.getMonth() - 1;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }
    const lmTrades = trades.filter(t => {
      if (!t.date) return false;
      const tDate = new Date(t.date);
      return tDate.getFullYear() === prevYear && tDate.getMonth() === prevMonth;
    });
    return lmTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  }, [trades]);

  const pnlPercentChange = useMemo(() => {
    if (lastMonthPnl === 0) {
      return mtdPnl > 0 ? 12.0 : 0.0;
    }
    const change = ((mtdPnl - lastMonthPnl) / Math.abs(lastMonthPnl)) * 100;
    return parseFloat(change.toFixed(1));
  }, [mtdPnl, lastMonthPnl]);

  const winRateMtd = useMemo(() => {
    const targetTrades = mtdTrades.length > 0 ? mtdTrades : trades;
    if (targetTrades.length === 0) return 0;
    const wins = targetTrades.filter(t => getTradeOutcome(t) === 'WIN').length;
    return Math.round((wins / targetTrades.length) * 100);
  }, [mtdTrades, trades]);

  const winCountMtd = useMemo(() => {
    const targetTrades = mtdTrades.length > 0 ? mtdTrades : trades;
    return targetTrades.filter(t => getTradeOutcome(t) === 'WIN').length;
  }, [mtdTrades, trades]);

  const totalCountMtd = useMemo(() => {
    const targetTrades = mtdTrades.length > 0 ? mtdTrades : trades;
    return targetTrades.length;
  }, [mtdTrades, trades]);

  const bestTradeMtd = useMemo(() => {
    const targetTrades = mtdTrades.length > 0 ? mtdTrades : trades;
    if (targetTrades.length === 0) return null;
    return [...targetTrades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0))[0];
  }, [mtdTrades, trades]);

  const bestTradeVal = useMemo(() => {
    return bestTradeMtd ? bestTradeMtd.pnl : 0;
  }, [bestTradeMtd]);

  const bestTradeMarket = useMemo(() => {
    return bestTradeMtd ? (bestTradeMtd.market || 'XAU/USD') : '—';
  }, [bestTradeMtd]);

  const bestTradeSession = useMemo(() => {
    return bestTradeMtd ? (bestTradeMtd.session || 'London') : '—';
  }, [bestTradeMtd]);

  const avgRRatio = useMemo(() => {
    const tradesWithRR = trades.filter(t => t.rr !== undefined && t.rr !== null && !isNaN(Number(t.rr)) && Number(t.rr) > 0);
    if (tradesWithRR.length === 0) return 0;
    const sum = tradesWithRR.reduce((s, t) => s + Number(t.rr), 0);
    return parseFloat((sum / tradesWithRR.length).toFixed(1));
  }, [trades]);

  const hasEnabledRules = (enabledRuleIds || []).length > 0;

  // `now` is a render-time snapshot by contract — costOfBrokenRules leaves the
  // window open at the top end precisely so a stale snapshot cannot drop trades
  // the subscription just pushed in.
  const disciplineCost = useMemo(
    () => costOfBrokenRules(disciplineViolations, trades, { now: Date.now(), windowMs: DISCIPLINE_COST_WINDOW_MS }),
    [disciplineViolations, trades],
  );

  // Both chart memos sorted the same array independently; one sort feeds both.
  const sortedTrades = useMemo(
    () => [...trades].sort((a, b) => a.date.localeCompare(b.date)),
    [trades],
  );

  // Resolved once per theme/accent change and shared by the data and options
  // memos, so a recolor costs one style recalc instead of sixteen.
  const chartColors = useChartTheme();

  const chartVisibleTrades = useMemo(() => {
    if (equityPeriod === '30') {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];
      return sortedTrades.filter(t => t.date >= cutoffStr);
    }
    return sortedTrades;
  }, [sortedTrades, equityPeriod]);

  const chartData = useMemo(() => {
    const colors = chartColors;
    let initialBalanceForChart = walletBalance || 0;

    if (equityPeriod === '30') {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];
      const olderTrades = sortedTrades.filter(t => t.date < cutoffStr);
      initialBalanceForChart += olderTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    }

    const chartLabels = ['Start', ...chartVisibleTrades.map(t => t.date)];
    let currentBalance = initialBalanceForChart;
    const chartDataPoints = [currentBalance, ...chartVisibleTrades.map(t => {
      currentBalance += t.pnl;
      return parseFloat(currentBalance.toFixed(2));
    })];

    return {
      labels: chartLabels,
      datasets: [{
        label: 'Equity',
        data: chartDataPoints,
        borderColor: colors.primary,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, colors.primaryFill);
          gradient.addColorStop(1, colors.primaryClear);
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 3,
      }]
    };
  }, [sortedTrades, walletBalance, equityPeriod, chartVisibleTrades, chartColors]);

  const chartOptions = useMemo(() => {
    const colors = chartColors;
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          padding: 12,
          borderRadius: 8,
          displayColors: false,
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: { display: false },
        y: {
          grid: { color: colors.grid, drawBorder: false },
          ticks: { color: colors.ticks, font: { size: 11 } }
        }
      }
    };
  }, [chartColors]);


  return (
    <div className="dashboard-overview flex flex-col gap-5 pb-6 md:gap-6">

      {/* HEADER */}
      <div className="dashboard-page-heading flex shrink-0 items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Gold trading command center</p>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">Performance, at a glance.</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your edge, risk and execution in one live view.</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusSquare state={isMarketOpen ? 'on' : 'off'} label={isMarketOpen ? 'Market open' : 'Market closed'}>
            {isMarketOpen ? 'Market open' : 'Market closed'}
          </StatusSquare>

          <Button
            variant={isExpanded ? 'destructive' : 'default'}
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <X data-icon="inline-start" aria-hidden="true" /> : <Plus data-icon="inline-start" aria-hidden="true" />}
            {isExpanded ? 'Close trade form' : 'New trade'}
          </Button>
        </div>
      </div>

      {/* KPI ROW */}
      <div className={`dashboard-kpi-grid grid shrink-0 grid-cols-2 gap-3 lg:gap-4 ${hasEnabledRules ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <StatCard
          label="Net P&L, month to date"
          value={formatSigned(mtdPnl)}
          tone={mtdPnl > 0 ? 'positive' : mtdPnl < 0 ? 'negative' : 'neutral'}
          delta={{
            direction: pnlPercentChange > 0 ? 'up' : pnlPercentChange < 0 ? 'down' : 'flat',
            value: `${Math.abs(pnlPercentChange)}% vs last month`,
          }}
        />
        <StatCard
          label="Win rate"
          value={`${winRateMtd}%`}
          hint={`${winCountMtd} of ${totalCountMtd} trades`}
        />
        <StatCard
          label="Best trade"
          value={bestTradeVal > 0 ? formatSigned(bestTradeVal) : '—'}
          tone={bestTradeVal > 0 ? 'positive' : 'neutral'}
          hint={bestTradeVal > 0 ? `${bestTradeMarket} · ${bestTradeSession}` : 'No trades yet'}
        />
        <StatCard
          label="Average R:R"
          value={`1:${avgRRatio}`}
          hint="Risk-adjusted"
        />
        {/*
          Discipline is a free-plan feature (§4.4: never locked, never blurred),
          so this card is written as a plain sibling rather than folded into a
          mapped/indexed stat array — the trap the Analytics grid sets, where
          `isLocked = isFree && stat.index > 1` silently captures any card
          appended to the list. No `locked` or `interactive` prop is passed
          here, and nothing on this page gates KPI cards by plan, so there is no
          index for a future lock to catch it by. Hidden outright while every
          rule is off: with no rules there is nothing to have cost anything.
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

      {/* MIDDLE TIER: LIVE MARKET WIDGET */}
      <div className="dashboard-market-strip relative z-10 w-full shrink-0">
        <LiveMarketWidget onTickersUpdate={setLiveTickers} onIntervalChange={setMarketInterval} />
      </div>

      {/* BOTTOM TIER: BIAS GAUGE & PERFORMANCE GRID */}
      <div className="dashboard-analysis-grid grid shrink-0 grid-cols-1 gap-4 lg:grid-cols-3">

        {/* GOLD BIAS GAUGE */}
        <SectionCard surface title="Gold bias" meta={marketInterval} divided={false} contentClassName="flex flex-col">
          <div className="flex flex-1 flex-col items-center justify-center py-2">
            <svg viewBox="0 0 200 145" className="mx-auto w-full max-w-[220px] overflow-visible" role="img" aria-label={`Gold bias ${biasPercentage}% — ${biasPercentage >= 60 ? 'bullish' : biasPercentage <= 40 ? 'bearish' : 'neutral'}`}>
              {/* Track */}
              <path
                d="M 46.31,106 A 62,62 0 1,1 153.69,106"
                fill="none"
                className="stroke-border"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Fill — the one accent, driven by the theme */}
              <path
                d="M 46.31,106 A 62,62 0 1,1 153.69,106"
                fill="none"
                className="stroke-primary transition-all duration-700 ease-out"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="259.7"
                strokeDashoffset={259.7 - (259.7 * biasPercentage) / 100}
              />
              {/* Direction labels: P&L semantics, so win/loss tokens apply */}
              <text x="62" y="80" className="fill-loss font-mono text-[10px]" textAnchor="middle">Bear</text>
              <text x="138" y="80" className="fill-win font-mono text-[10px]" textAnchor="middle">Bull</text>

              <text x="100" y="108" className="figure fill-foreground text-2xl font-medium" textAnchor="middle">
                {biasPercentage}%
              </text>
              <text x="100" y="124" className="fill-muted-foreground font-mono text-[10px]" textAnchor="middle">
                {biasPercentage >= 60 ? 'Bullish' : biasPercentage <= 40 ? 'Bearish' : 'Neutral'}
              </text>

              <line
                x1="100"
                y1="75"
                x2={needleX}
                y2={needleY}
                className="stroke-foreground transition-all duration-700 ease-out"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="100" cy="75" r="4" className="fill-card stroke-foreground" strokeWidth="2" />
            </svg>
          </div>

          <dl className="mt-3 grid grid-cols-3 divide-x divide-border rounded-lg border border-border">
            <div className="flex flex-col gap-0.5 p-2.5">
              <dt className="text-xs text-muted-foreground">XAU/USD</dt>
              <dd className="figure m-0 text-sm text-foreground">
                {goldPriceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 p-2.5">
              <dt className="text-xs text-muted-foreground">24h change</dt>
              <dd className={`figure m-0 text-sm ${goldChangeValue >= 0 ? 'text-win' : 'text-loss'}`}>
                {goldChangeValue >= 0 ? '+' : '−'}{Math.abs(goldChangeValue).toFixed(2)}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 p-2.5">
              <dt className="text-xs text-muted-foreground">Trend</dt>
              <dd className="m-0 text-sm text-foreground">
                <span aria-hidden="true">{goldChangeValue >= 0 ? '▲' : '▼'}</span> {goldChangeValue >= 0 ? 'Up' : 'Down'}
              </dd>
            </div>
          </dl>
        </SectionCard>

        {/* EQUITY CURVE */}
        <SectionCard
          surface
          title="Equity curve"
          description="Historical performance"
          className="lg:col-span-2"
          actions={
            <ToggleGroup
              spacing={0}
              value={[equityPeriod]}
              onValueChange={([next]) => next && setEquityPeriod(next)}
            >
              <ToggleGroupItem value="30" size="sm">30d</ToggleGroupItem>
              <ToggleGroupItem value="all" size="sm">All</ToggleGroupItem>
            </ToggleGroup>
          }
        >
          <div className="min-h-[300px] w-full">
            {trades.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <EmptyState
                title="No performance data"
                description="Log the first trade and the curve starts here."
                className="h-full"
              />
            )}
          </div>
        </SectionCard>

      </div>

      {/* RECENT ACTIVITY */}
      <SectionCard className="dashboard-activity" surface padded={false} title="Recent activity" meta={`${Math.min(trades.length, 10)} of ${trades.length}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4 pt-1">
            <TabsList activateOnFocus>
              <TabsTrigger value="history">Positions</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="history">
            <DataTable
              caption="Ten most recent trades"
              columns={RECENT_TRADE_COLUMNS}
              rows={trades.slice(0, 10)}
              getRowId={(t, i) => `${t.date}-${i}`}
              empty={
                <EmptyState
                  title="No positions logged yet"
                  description="Log a trade or connect MT4/MT5 and the fills arrive on their own."
                  className="py-8"
                />
              }
            />
          </TabsContent>
          <TabsContent value="orders">
            <EmptyState
              title="No active orders"
              description="Limit and stop orders will appear here."
              className="py-12"
            />
          </TabsContent>
        </Tabs>
      </SectionCard>

    </div>
  );
}
