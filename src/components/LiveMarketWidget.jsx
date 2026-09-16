import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'react-bootstrap-icons';
import { useAppTheme } from '../hooks/useAppTheme';
// One market-data access layer for the app: the proxy→direct fallback, the
// in-flight dedupe (both loops below poll the same four spot URLs), and the
// weekend gate all live in ../lib/marketData now.
import { fetchSpotPrice, fetchYahooChart, isSpotPollingPaused } from '../lib/marketData';

const TIMEFRAMES = [
  { id: '1', label: '1m' },
  { id: '5', label: '5m' },
  { id: '15', label: '15m' },
  { id: '30', label: '30m' },
  { id: '60', label: '1h' },
  { id: '240', label: '4h' },
  { id: 'D', label: '1D' },
  { id: 'W', label: '1W' }
];

const TIMEFRAME_UPDATE_MS = {
  '1': 60 * 1000,
  '5': 5 * 60 * 1000,
  '15': 15 * 60 * 1000,
  '30': 30 * 60 * 1000,
  '60': 60 * 60 * 1000,
  '240': 4 * 60 * 60 * 1000,
  D: 24 * 60 * 60 * 1000,
  W: 7 * 24 * 60 * 60 * 1000,
};

const YAHOO_INTERVALS = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '1h',
  '240': '1h',
  D: '1d',
  W: '1wk',
};

const SPOT_SYMBOLS = { xauusd: 'XAU', xagusd: 'XAG', xptusd: 'XPT', xpdusd: 'XPD' };

/** How many live samples the sparkline keeps. Push-then-trim, so it never grows. */
const HISTORY_LIMIT = 12;

/**
 * `/spot-price` answers with `Cache-Control: public, s-maxage=10` (see
 * api/[...route].ts), so for ten seconds after any request the CDN hands back a
 * byte-identical body without touching the origin. Polling faster than that TTL
 * buys exactly zero freshness — it just spends requests and churns React state
 * with values that did not change. 12s is the first cadence that clears the TTL
 * on every hop.
 *
 * Long timeframes back off further: a 12s tick under a 1-day candle is noise. The
 * cadence is one poll per ~1/30th of a candle, clamped to [12s, 60s]:
 *   1m, 5m → 12s (floor)    15m → 30s    30m and longer → 60s (ceiling), incl. 1D/1W.
 *
 * Written against the candle length rather than
 * `Math.min(TIMEFRAME_UPDATE_MS[interval], 60000)` because that form floors every
 * timeframe at the 60s ceiling — a 1m candle is itself 60000ms — which would turn
 * the live tick off on precisely the timeframes it exists for.
 */
const SPOT_CACHE_TTL_MS = 10000; // s-maxage on /spot-price
const MIN_TICK_POLL_MS = SPOT_CACHE_TTL_MS + 2000;
const MAX_TICK_POLL_MS = 60000;
const TICKS_PER_CANDLE = 30;

function tickPollMs(interval) {
  const candleMs = TIMEFRAME_UPDATE_MS[interval] ?? TIMEFRAME_UPDATE_MS['1'];
  return Math.max(MIN_TICK_POLL_MS, Math.min(candleMs / TICKS_PER_CANDLE, MAX_TICK_POLL_MS));
}

/**
 * The reference price a % change is measured from.
 *
 * `history[0]` is NOT a baseline: the tick loop shifts the oldest sample off once
 * the window is full, so reading the baseline out of the array walks it forward
 * every HISTORY_LIMIT ticks and decays the reported change toward zero. Whatever
 * this resolves to is pinned onto the ticker as `base` by the first writer, and
 * every later tick reuses it.
 */
function baselineOf(ticker) {
  if (Number.isFinite(ticker?.base) && ticker.base > 0) return ticker.base;
  const seed = ticker?.history?.[0];
  if (Number.isFinite(seed) && seed > 0) return seed;
  return Number.isFinite(ticker?.price) && ticker.price > 0 ? ticker.price : 0;
}

function percentChange(price, base) {
  if (!Number.isFinite(price) || !Number.isFinite(base) || base <= 0) return 0;
  return Number((((price - base) / base) * 100).toFixed(2));
}

/**
 * One live spot tick applied to a ticker. Pure, and returns the SAME object when
 * the tick carries nothing new — a fresh identity on every poll would re-run
 * `onTickersUpdate` and every memo hanging off it downstream, and with a 10s CDN
 * TTL an unchanged consecutive read is the common case, not the exception.
 */
function applyTick(ticker, price) {
  if (!ticker || !Number.isFinite(price) || price <= 0 || price === ticker.price) return ticker;
  const base = baselineOf(ticker);
  const history = [...ticker.history, price];
  while (history.length > HISTORY_LIMIT) history.shift();
  return { ...ticker, price, base, change: percentChange(price, base), history };
}

/**
 * `{price, change}` from a Yahoo chart payload; either half is null when the
 * payload does not actually carry it.
 *
 * Yahoo returns `regularMarketPrice: null` between sessions and omits
 * `chartPreviousClose` on partial payloads. `Number(null)` is 0 and
 * `Number(undefined)` is NaN, and the un-validated arithmetic those fed produced
 * a NaN change that was written straight into `base` and `history[0]` — after
 * which every tick computed `(price - NaN) / NaN`, the badge read "NaN%", and the
 * sparkline emitted `d="M NaN NaN …"` and silently vanished until a reload.
 * Unknown is null here so callers keep the last real value instead of publishing
 * a fabricated 0.00%.
 */
function readYahooQuote(payload) {
  const meta = payload?.chart?.result?.[0]?.meta;
  if (!meta) return { price: null, change: null };
  const raw = Number(meta.regularMarketPrice);
  const prevClose = Number(meta.chartPreviousClose);
  const price = Number.isFinite(raw) && raw > 0 ? raw : null;
  const change =
    price !== null && Number.isFinite(prevClose) && prevClose > 0
      ? Number((((price - prevClose) / prevClose) * 100).toFixed(2))
      : null;
  return { price, change };
}

/**
 * An authoritative price (+ optional previous-close change) applied to a ticker.
 * Rescales the accumulated tick history onto the new price so the sparkline keeps
 * its shape across the splice, and pins `base` — always to a finite number, so the
 * tick loop never has to fall back to the moving `history[0]` again.
 *
 * Deliberately no longer overwrites `history[0]` with the baseline: with `base`
 * stored on the ticker the % maths does not need it, and it meant the oldest
 * sample was sometimes yesterday's close and sometimes a real tick (whichever the
 * window had not shifted off yet) — an outlier that skewed the sparkline's range
 * and every consumer that averages the history.
 *
 * Pure; returns the SAME object when nothing moved.
 */
function applyRealPrice(ticker, quote) {
  if (!ticker || !Number.isFinite(quote?.price) || quote.price <= 0) return ticker;
  const multiplier = Number.isFinite(ticker.price) && ticker.price > 0 ? quote.price / ticker.price : 1;
  const history =
    multiplier === 1 ? ticker.history : ticker.history.map((h) => Number((h * multiplier).toFixed(3)));

  const hasChange = quote.change !== null && quote.change !== undefined && Number.isFinite(quote.change);
  const change = hasChange ? quote.change : ticker.change;
  let base = hasChange
    ? Number((quote.price / (1 + quote.change / 100)).toFixed(3))
    : baselineOf({ ...ticker, history });
  if (!Number.isFinite(base) || base <= 0) base = quote.price;

  if (
    history === ticker.history &&
    ticker.price === quote.price &&
    ticker.change === change &&
    ticker.base === base
  ) {
    return ticker;
  }
  return { ...ticker, price: quote.price, base, change, history };
}

export function LiveMarketWidget({ onTickersUpdate, onIntervalChange }) {
  const { isLightMode } = useAppTheme();
  const [interval, setIntervalState] = useState('1');
  const [activeAsset, setActiveAsset] = useState('xauusd');

  // Real-time Simulated Tickers state
  const [tickers, setTickers] = useState({
    xauusd: { id: 'xauusd', name: 'XAU/USD', desc: 'Gold Spot / US Dollar (OANDA)', tvSymbol: 'OANDA:XAUUSD', symbol: 'Au', color: 'amber-500', price: 4150.560, change: -0.20, history: [4140.000, 4145.000, 4148.000, 4152.000, 4156.000, 4147.000, 4151.000, 4149.000, 4150.560] },
    xagusd: { id: 'xagusd', name: 'XAG/USD', desc: 'Silver Spot / US Dollar (OANDA)', tvSymbol: 'OANDA:XAGUSD', symbol: 'Ag', color: 'slate-300', price: 29.355, change: -0.07, history: [29.400, 29.380, 29.320, 29.350, 29.370, 29.310, 29.360, 29.340, 29.355] },
    xptusd: { id: 'xptusd', name: 'XPT/USD', desc: 'Platinum Spot / US Dollar (OANDA)', tvSymbol: 'OANDA:XPTUSD', symbol: 'Pt', color: 'slate-400', price: 995.100, change: -0.01, history: [996.000, 995.500, 994.000, 995.000, 995.800, 994.200, 995.300, 994.800, 995.100] },
    xpdusd: { id: 'xpdusd', name: 'XPD/USD', desc: 'Palladium Spot / US Dollar (OANDA)', tvSymbol: 'OANDA:XPDUSD', symbol: 'Pd', color: 'slate-500', price: 1028.100, change: -0.02, history: [1029.000, 1028.500, 1027.000, 1028.000, 1028.600, 1027.400, 1028.300, 1027.800, 1028.100] }
  });

  // The tick loop owns no reactive deps, so it reads the selected timeframe off a
  // ref instead of listing it: making `interval` a dep would tear the loop down
  // and rebuild it on every timeframe click, restarting the poll clock each time.
  const intervalRef = useRef(interval);
  useEffect(() => { intervalRef.current = interval; }, [interval]);

  // Live ticks loop — polls real spot prices so ticks match TradingView.
  //
  // Self-scheduling rather than setInterval: the cadence depends on the timeframe
  // (see tickPollMs) and is re-read at every hop, and scheduling the next poll only
  // once the previous one has settled makes "one request in flight" structural
  // instead of a flag that has to be reset on every exit path.
  useEffect(() => {
    const controller = new AbortController();
    const entries = Object.entries(SPOT_SYMBOLS);
    let stopped = false;
    let timer = 0;

    const schedule = () => {
      if (stopped) return;
      timer = window.setTimeout(poll, tickPollMs(intervalRef.current));
    };

    const poll = async () => {
      try {
        // Same rest window as before (Friday 17:00 → Sunday 17:00 New York), now
        // read from the one weekend definition instead of a local wall-clock copy
        // that drifted from it around the DST changeovers.
        if (isSpotPollingPaused(Date.now()) || document.visibilityState === 'hidden') return;

        const prices = await Promise.all(
          entries.map(([, spotSymbol]) => fetchSpotPrice(spotSymbol, { signal: controller.signal }))
        );
        // Unmounted (or aborted) while those were in the air: drop the result
        // rather than writing state nobody is rendering.
        if (stopped || controller.signal.aborted) return;

        setTickers(prev => {
          let changed = false;
          const next = { ...prev };
          entries.forEach(([id], idx) => {
            const updated = applyTick(next[id], prices[idx]);
            if (updated === next[id]) return;
            next[id] = updated;
            changed = true;
          });
          return changed ? next : prev;
        });
      } finally {
        // Runs on the early returns too, so a paused/hidden/aborted tick still
        // arms the next one and the loop can resume by itself.
        schedule();
      }
    };

    schedule();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    onIntervalChange?.(TIMEFRAMES.find(t => t.id === interval)?.label || '1m');
  }, [interval, onIntervalChange]);

  // Fetch actual prices on mount to sync simulated prices with TradingView charts
  useEffect(() => {
    const controller = new AbortController();
    const assets = [
      { id: 'xauusd', spotSymbol: 'XAU', yahooSymbol: 'GC=F' },
      { id: 'xagusd', spotSymbol: 'XAG', yahooSymbol: 'SI=F' },
      { id: 'xptusd', spotSymbol: 'XPT', yahooSymbol: 'PL=F' },
      { id: 'xpdusd', spotSymbol: 'XPD', yahooSymbol: 'PA=F' }
    ];
    // One shape per timeframe, not one per asset.
    const yahooInterval = YAHOO_INTERVALS[interval] || YAHOO_INTERVALS['1'];
    const yahooRange = interval === 'D' ? '1mo' : interval === 'W' ? '6mo' : ['60', '240'].includes(interval) ? '5d' : '1d';
    let running = false;

    const fetchRealPrices = async ({ scheduled = false } = {}) => {
      // Eight requests per round (4 assets × spot + chart). Skip entirely while
      // the tab is hidden rather than polling into the void.
      if (document.visibilityState === 'hidden') return;
      // Don't keep re-polling a shut market all weekend. Only the repeats are
      // gated: the mount fetch and the tab-focus catch-up still run, so a Sunday
      // visitor sees Friday's close rather than the hardcoded seed prices.
      if (scheduled && isSpotPollingPaused(Date.now())) return;
      // One round at a time. The timer and the visibility catch-up can otherwise
      // land together — flipping tabs repeatedly used to fire an eight-request
      // round per flip, all of them writing the same state.
      if (running) return;
      running = true;
      try {
        const results = await Promise.all(
          assets.map(async (asset) => {
            // Spot keeps its proxy→Gold-API fallback so the price still matches
            // the TradingView chart while our API is down; Yahoo is proxy-only
            // (no CORS) and yields null instead. Neither call throws.
            const [spotPrice, yahooData] = await Promise.all([
              fetchSpotPrice(asset.spotSymbol, { signal: controller.signal }),
              fetchYahooChart(asset.yahooSymbol, { interval: yahooInterval, range: yahooRange, signal: controller.signal }),
            ]);

            const quote = readYahooQuote(yahooData);
            // Spot is preferred; Yahoo's own price is the last resort when both
            // spot endpoints fail.
            const price = Number.isFinite(spotPrice) && spotPrice > 0 ? spotPrice : quote.price;
            return price === null ? null : { id: asset.id, price, change: quote.change };
          })
        );

        // Unmounted or timeframe-switched while those were in the air.
        if (controller.signal.aborted) return;

        setTickers(prev => {
          let changed = false;
          const next = { ...prev };
          results.forEach(res => {
            if (!res) return;
            const updated = applyRealPrice(next[res.id], res);
            if (updated === next[res.id]) return;
            next[res.id] = updated;
            changed = true;
          });
          // Same object when the round produced nothing — a total outage returns
          // four nulls, and re-publishing an identical map would still re-render
          // every consumer of onTickersUpdate.
          return changed ? next : prev;
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Error fetching real-time prices:', err);
      } finally {
        running = false;
      }
    };

    fetchRealPrices();
    const intervalId = window.setInterval(
      () => fetchRealPrices({ scheduled: true }),
      TIMEFRAME_UPDATE_MS[interval] || TIMEFRAME_UPDATE_MS['1']
    );
    // Catch up as soon as the tab comes back, instead of waiting a full period.
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchRealPrices(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      controller.abort();
    };
  }, [interval]);

  useEffect(() => {
    if (typeof onTickersUpdate === 'function') {
      onTickersUpdate(tickers);
    }
  }, [tickers, onTickersUpdate]);

  // Helper to generate SVG sparkline path
  const getSparklinePath = (history, width = 120, height = 36) => {
    // Every sample has to be a real number: a single NaN makes min and max NaN,
    // which makes every coordinate NaN, which makes `d` an invalid path the
    // browser drops on the floor — the line just disappears, with no error
    // anywhere. Better to draw nothing on purpose than to draw nothing by accident.
    if (!Array.isArray(history) || history.length < 2 || !history.every(Number.isFinite)) return '';
    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;

    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return { x, y };
    });

    // Generate cubic bezier curve for smooth sparklines
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 3;
      const cpY1 = curr.y;
      const cpX2 = curr.x + 2 * (next.x - curr.x) / 3;
      const cpY2 = next.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const getClosedSparklinePath = (history, pathData, width = 120, height = 36) => {
    if (!pathData) return '';
    return `${pathData} L ${width} ${height} L 0 ${height} Z`;
  };

  const tvTheme = isLightMode ? 'light' : 'dark';
  const activeData = tickers[activeAsset];
  const iframeSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(activeData.tvSymbol)}&interval=${interval}&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=${tvTheme}&timezone=exchange&showpopupbutton=1&studylabelbg=rgba(255%2C%20255%2C%20255%2C%201)&page-uri=https%3A%2F%2Fwww.tradingview.com%2Fwidgetembed%2F`;

  const getAssetColorClasses = (color) => {
    switch (color) {
      case 'slate-300':
        return 'bg-slate-300/10 border-slate-300/20 text-muted-foreground';
      case 'slate-400':
        return 'bg-slate-400/10 border-slate-400/20 text-muted-foreground';
      case 'slate-500':
        return 'bg-slate-500/10 border-slate-500/20 text-muted-foreground';
      case 'amber-500':
      default:
        return 'bg-amber-500/10 border-amber-500/20 text-primary';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* MAIN LIVE CHART CARD */}
      <div className="apple-glass-panel rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden group min-h-[600px]">

        {/* Chart Header */}
        <div className="flex flex-wrap justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border ${getAssetColorClasses(activeData.color)}`}>
              {activeData.symbol}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-foreground m-0">{activeData.name}</h2>
                <span className={`flex items-center text-[10px] font-black px-2 py-0.5 rounded-full ${activeData.change >= 0 ? 'bg-green-500/10 text-win border border-green-500/20' : 'bg-red-500/10 text-loss border border-red-500/20'}`}>
                  {activeData.change >= 0 ? '+' : ''}{activeData.change}%
                </span>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider m-0 mt-0.5">{activeData.desc}</p>
            </div>
          </div>

          {/* Price & Timeframes */}
          <div className="flex flex-col sm:items-end gap-1.5 self-stretch sm:self-auto">
            <div className="flex items-baseline gap-2 justify-between sm:justify-start">
              <span className="text-2xl font-black text-foreground tracking-tight">
                {activeAsset !== 'us10y' ? '$' : ''}{activeData.price.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {TIMEFRAMES.find(t => t.id === interval)?.label || '1m'}
              </span>
            </div>

            {/* Timeframe selector */}
            <div className="flex max-w-full flex-wrap bg-muted/40 p-0.5 rounded-xl border border-border/40 self-end sm:self-auto shrink-0 overflow-x-auto">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={interval === t.id}
                  onClick={() => setIntervalState(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider hover:scale-[1.06] active:scale-[0.94] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${interval === t.id
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Embedded Live Chart */}
        <div className="flex-1 w-full min-h-[460px] rounded-2xl overflow-hidden border border-border/30 bg-card/10 relative z-10 [transform:translateZ(0)] [mask-image:-webkit-radial-gradient(white,black)]">
          <iframe
            key={`${activeAsset}-${interval}`}
            src={iframeSrc}
            title="XAUUSD Live Market Candlestick Chart"
            className="w-full h-full border-0 absolute inset-0"
            allowFullScreen
          />
        </div>
      </div>

      {/* Tickers Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'xauusd', name: 'XAU/USD', desc: 'Gold/USD', prefix: '$', suffix: '' },
          { id: 'xagusd', name: 'XAG/USD', desc: 'Silver/USD', prefix: '$', suffix: '' },
          { id: 'xptusd', name: 'XPT/USD', desc: 'Platinum/USD', prefix: '$', suffix: '' },
          { id: 'xpdusd', name: 'XPD/USD', desc: 'Palladium/USD', prefix: '$', suffix: '' }
        ].map((t) => {
          const ticker = tickers[t.id];
          if (!ticker) return null;
          const isUp = ticker.change >= 0;
          const strokeColor = isUp ? 'hsl(var(--win))' : 'hsl(var(--loss))';
          const path = getSparklinePath(ticker.history, 140, 36);
          const closedPath = getClosedSparklinePath(ticker.history, path, 140, 36);

          return (
            <button
              type="button"
              aria-pressed={activeAsset === t.id}
              key={t.id} 
              onClick={() => setActiveAsset(t.id)}
              className={`apple-glass-panel rounded-2xl p-4 flex min-w-0 flex-col items-stretch justify-between gap-3 text-left group hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden cursor-pointer ${activeAsset === t.id ? 'ring-2 ring-primary/50 bg-primary/5 shadow-lg shadow-primary/5' : 'hover:shadow-lg hover:shadow-foreground/5'}`}
            >
              <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground m-0">{t.name}</p>
                <h4 className="text-base font-black text-foreground tracking-tight m-0">
                  {t.prefix}{ticker.price.toLocaleString(undefined, { minimumFractionDigits: 3 })}{t.suffix}
                </h4>
                <div className="flex items-center gap-1">
                  <span className={`inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded-full ${isUp ? 'bg-green-500/10 text-win' : 'bg-red-500/10 text-loss'
                    }`}>
                    {isUp ? <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> : <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />}
                    {isUp ? '+' : ''}{ticker.change}%
                  </span>
                  <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-widest leading-none mt-0.5">{t.desc}</span>
                </div>
              </div>

              {/* Sparkline Canvas SVG */}
              <div className="w-full max-w-[140px] h-[36px] relative z-10 shrink-0 self-end">
                <svg width="100%" height="100%" viewBox="0 0 140 36" className="overflow-visible">
                  <defs>
                    <linearGradient id={`grad-${t.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Closed area gradient */}
                  {closedPath && (
                    <path d={closedPath} fill={`url(#grad-${t.id})`} stroke="none" />
                  )}

                  {/* Top stroke line */}
                  {path && (
                    <path
                      d={path}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />
                  )}
                </svg>
              </div>

              {/* Background Accent Lines */}
              <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary/2 rounded-full blur-2xl pointer-events-none" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
