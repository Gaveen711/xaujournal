import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMonthTrades } from '../hooks/useMonthTrades';
import { pad2, formatNumber, formatSigned, formatSignedCompact, pnlToneClass } from '../lib/tradeUtils';
import { DirectionCell } from '../components/app/DirectionCell';
import {
  getTradeOutcome,
  getTradeSessionCode,
  getTradeSetupKey,
} from '../lib/tradeAnalytics.js';
import { PRIMARY_SESSIONS, SESSION_LABELS, primarySessionForCode } from '../lib/sessionEngine.js';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { SectionCard } from '../components/app/SectionCard';
import { StatCard } from '../components/app/StatCard';
import { EmptyState } from '../components/app/EmptyState';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const pnlTone = pnlToneClass;

export function CalendarPage() {
  // `setupsById` is what turns a stored setupId into the name the rest of the
  // app shows; without it this page grouped on the raw legacy `setup` string
  // and reported renamed or merged setups as if they were still separate.
  const { user, plan, setupsById, resolveSetup } = useOutletContext();

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedCalDay, setSelectedCalDay] = useState(null);

  // Only the month on screen, live. Replaces a full-collection drain that cost
  // one document read per trade in the account to render ~30 of them.
  const {
    trades,
    isLoading: isLoadingTrades,
    error: historyLoadError,
    reload: retryMonth,
  } = useMonthTrades(user, calYear, calMonth);

  const formatDate = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
  const fmtDate = (dateString) => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(dateString + 'T00:00:00'));

  // ── Memoized Monthly calculations and pre-grouping ───────────────────────
  const monthlyStats = useMemo(() => {
    // 1. Pre-group all trades by date (O(T) total prep time)
    const tradesByDate = {};
    trades.forEach(t => {
      if (t.date) {
        if (!tradesByDate[t.date]) {
          tradesByDate[t.date] = [];
        }
        tradesByDate[t.date].push(t);
      }
    });

    // 2. Extract monthly trades
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const monthlyTrades = trades.filter(t => {
      if (!t.date) return false;
      const [y, m] = t.date.split('-').map(Number);
      return y === calYear && (m - 1) === calMonth;
    });

    const monthlyPnl = monthlyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalMonthlyTrades = monthlyTrades.length;

    let winDays = 0;
    let activeDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${calYear}-${pad2(calMonth + 1)}-${pad2(d)}`;
      const dayTrs = tradesByDate[key] || [];
      if (dayTrs.length > 0) {
        activeDays++;
        const dayPnl = dayTrs.reduce((sum, t) => sum + (t.pnl || 0), 0);
        // A green DAY is still a P&L question — a day has no stored outcome.
        // Individual trades below go through getTradeOutcome instead.
        if (dayPnl > 0.01) winDays++;
      }
    }
    const consistencyRate = activeDays > 0 ? (winDays / activeDays) * 100 : 0;
    const totalLots = monthlyTrades.reduce((sum, t) => sum + (Number(t.lots) || 0), 0);
    const totalPips = monthlyTrades.reduce((sum, t) => sum + (Number(t.pips) || 0), 0);

    // ── Monthly Analytics (Session & Setup) ──────────────────────────────────
    // Bucketed on the same key the Setups analytics counts under, then resolved
    // to the catalog's current name — so a renamed setup stays one row here and
    // a merged one reports under its target, exactly as it does elsewhere.
    const setupStats = {};
    monthlyTrades.forEach(t => {
      const key = getTradeSetupKey(t, setupsById);
      if (!setupStats[key]) setupStats[key] = { pnl: 0, count: 0, wins: 0 };
      setupStats[key].pnl += (t.pnl || 0);
      setupStats[key].count++;
      if (getTradeOutcome(t) === 'WIN') setupStats[key].wins++;
    });
    const sortedSetups = Object.entries(setupStats).map(([key, data]) => ({
      name: key === 'untagged' ? 'Untagged' : (resolveSetup?.(key)?.name || key),
      ...data,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0
    })).sort((a, b) => b.pnl - a.pnl).slice(0, 2);

    // Through the engine, not a local string matcher. The matcher this replaces
    // keyed on the free-text `session` field with its own spelling list (it even
    // carried a 'tokoyo' typo) and folded Sydney into Tokyo, so this page could
    // report a different best session than Analytics did for the same month.
    const sessionStats = Object.fromEntries(
      PRIMARY_SESSIONS.map((name) => [name, { pnl: 0, count: 0 }])
    );
    monthlyTrades.forEach(t => {
      const session = primarySessionForCode(getTradeSessionCode(t));
      if (!session) return;
      sessionStats[session].pnl += (t.pnl || 0);
      sessionStats[session].count++;
    });

    let bestSession = '';
    let bestSessionPnl = -Infinity;
    Object.entries(sessionStats).forEach(([name, data]) => {
      if (data.count > 0 && data.pnl > bestSessionPnl) {
        bestSessionPnl = data.pnl;
        bestSession = SESSION_LABELS[name] || name;
      }
    });

    let bestSetup = '';
    let bestSetupPnl = -Infinity;
    sortedSetups.forEach(s => {
      if (s.pnl > bestSetupPnl) {
        bestSetupPnl = s.pnl;
        bestSetup = s.name;
      }
    });

    let smartTip = "Log more trades to unlock personalized consistency insights.";
    if (bestSession && bestSessionPnl > 0) {
      smartTip = `Your edge is strongest during the ${bestSession} session this month. Focus execution there.`;
      if (bestSetup && bestSetupPnl > 0) {
        smartTip = `Your highest consistency setup is '${bestSetup}' during ${bestSession}. Prioritize these setups.`;
      }
    } else if (bestSetup && bestSetupPnl > 0) {
      smartTip = `The '${bestSetup}' setup is driving your growth this month. Keep practicing selective execution.`;
    }

    return {
      tradesByDate,
      daysInMonth,
      monthlyTrades,
      monthlyPnl,
      totalMonthlyTrades,
      consistencyRate,
      winDays,
      activeDays,
      totalLots,
      totalPips,
      sortedSetups,
      sessionStats,
      bestSession,
      bestSetup,
      smartTip
    };
  }, [trades, calMonth, calYear, setupsById, resolveSetup]);

  const {
    tradesByDate,
    daysInMonth,
    consistencyRate,
    winDays,
    activeDays,
    sortedSetups,
    sessionStats,
    smartTip
  } = monthlyStats;

  // O(1) day trades retrieval using our pre-grouped date map
  const dayTrades = (y, m, d) => {
    const key = formatDate(y, m, d);
    return tradesByDate[key] || [];
  };

  // ── Render Calendar Cells ──────────────────────────────────────────────────
  const renderCells = () => {
    const cells = [];
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    // 1. Prev Month Padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      cells.push(
        <div key={`prev-${d}`} className="min-h-[76px] sm:min-h-[104px] rounded-md border border-transparent p-2 select-none">
          <span className="font-mono text-[11px] text-muted-foreground/40">{d}</span>
        </div>
      );
    }

    // 2. Active Month Days
    for (let d = 1; d <= daysInMonth; d++) {
      const ts = dayTrades(calYear, calMonth, d);
      const pnl = ts.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const hasTrades = ts.length > 0;
      const isWin = pnl > 0.01;
      const isLoss = pnl < -0.01;

      const todayDate = new Date();
      const isToday = d === todayDate.getDate() && calMonth === todayDate.getMonth() && calYear === todayDate.getFullYear();
      const isSelected = d === selectedCalDay;

      cells.push(
        <button
          key={`day-${d}`}
          type="button"
          aria-pressed={isSelected}
          // Without this a screen reader announces the cell as just its day
          // number: neither the date nor the result it is reporting.
          aria-label={`${fmtDate(formatDate(calYear, calMonth, d))}${
            hasTrades
              ? `, ${ts.length} ${ts.length === 1 ? 'trade' : 'trades'}, net ${formatSigned(pnl, 0)}`
              : ', no trades'
          }`}
          onClick={() => setSelectedCalDay(d)}
          className={cn(
            'flex min-w-0 min-h-[76px] sm:min-h-[104px] flex-col justify-between rounded-md border px-1 py-2 sm:px-2 text-left transition-colors',
            isToday ? 'border-primary' : 'border-border',
            isSelected ? 'bg-muted' : 'bg-card hover:bg-muted'
          )}
        >
          <div className="flex w-full items-start justify-between gap-1">
            <span className="font-mono text-[11px] text-muted-foreground">{d}</span>
            {hasTrades && (
              <span className="font-mono text-[11px] text-muted-foreground">{ts.length}</span>
            )}
          </div>
          {hasTrades && (
            <span
              className={cn(
                'figure max-w-full truncate text-[10px] sm:text-sm',
                isWin ? 'text-win' : isLoss ? 'text-loss' : 'text-foreground'
              )}
            >
              <span className="sm:hidden">{formatSignedCompact(pnl)}</span>
              <span className="hidden sm:inline">{formatSigned(pnl, 0)}</span>
            </span>
          )}
        </button>
      );
    }

    // 3. Next Month Padding — pad to a whole number of weeks, not to a fixed
    // 42 cells. A short month that starts early needs five rows; the fixed
    // count always drew six, leaving a blank row hanging under the grid.
    const totalCellsFilled = firstDayIndex + daysInMonth;
    const nextMonthPadding = Math.ceil(totalCellsFilled / 7) * 7 - totalCellsFilled;
    for (let i = 1; i <= nextMonthPadding; i++) {
      cells.push(
        <div key={`next-${i}`} className="min-h-[76px] sm:min-h-[104px] rounded-md border border-transparent p-2 select-none">
          <span className="font-mono text-[11px] text-muted-foreground/40">{i}</span>
        </div>
      );
    }

    return cells;
  };

  const selectedTrades = selectedCalDay ? dayTrades(calYear, calMonth, selectedCalDay) : [];
  const selectedDate = selectedCalDay ? formatDate(calYear, calMonth, selectedCalDay) : '';
  const selectedTotal = selectedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const selectedLots = selectedTrades.reduce((sum, t) => sum + (Number(t.lots) || 0), 0);
  const selectedPips = selectedTrades.reduce((sum, t) => sum + (Number(t.pips) || 0), 0);
  const selectedWins = selectedTrades.filter(t => getTradeOutcome(t) === 'WIN').length;
  const selectedDayWinRate = selectedTrades.length > 0 ? (selectedWins / selectedTrades.length) * 100 : 0;

  const changeMonth = (delta) => {
    let nextMonth = calMonth + delta, nextYear = calYear;
    if (nextMonth < 0) { nextMonth = 11; nextYear--; }
    if (nextMonth > 11) { nextMonth = 0; nextYear++; }
    setCalMonth(nextMonth);
    setCalYear(nextYear);
    setSelectedCalDay(null);
  };

  const monthName = new Date(calYear, calMonth, 1).toLocaleString('default', { month: 'long' });
  const selectedPipsValue = selectedPips > 0
    ? `+${formatNumber(selectedPips, 0)}`
    : selectedPips < 0
      ? `−${formatNumber(Math.abs(selectedPips), 0)}`
      : formatNumber(0, 0);

  // Loading and error states replace the GRID, never the page. These used to
  // be early returns, so every month change unmounted the header along with
  // the month arrows that had just been clicked — the controls vanished
  // under the pointer and the page height collapsed on each step.
  const gridState = historyLoadError ? 'error' : isLoadingTrades ? 'loading' : 'ready';

  return (
    <div className="flex flex-col gap-6">

      {/* HEADER */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-lg font-medium text-foreground">Calendar</h1>
            {plan === 'free' && (
              <span className="inline-flex h-[18px] items-center rounded-sm border border-border px-1.5 font-mono text-[11px] leading-none text-muted-foreground">
                Free
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Daily P&L and consistency, one month at a time.</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCalMonth(new Date().getMonth());
              setCalYear(new Date().getFullYear());
              setSelectedCalDay(null);
            }}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => changeMonth(-1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="min-w-[124px] text-center text-sm font-medium text-foreground select-none">
            {monthName} <span className="figure text-muted-foreground">{calYear}</span>
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => changeMonth(1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* MAIN CONTAINER: CALENDAR GRID + DETAIL PANEL */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Calendar Grid */}
        <SectionCard
          title="Month overview"
          // Zeroes during a month fetch read as "no trading days", not "not
          // counted yet".
          meta={gridState === 'ready' ? `${activeDays} active · ${winDays} green` : '—'}
          className="lg:col-span-2"
        >
          {gridState === 'error' ? (
            <div className="py-10 text-center">
              <h2 className="text-sm font-medium text-foreground">This month could not be loaded</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The grid is hidden so a partial month is not mistaken for complete data.
              </p>
              <Button size="sm" className="mt-4" onClick={retryMonth}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              {/* Weekday headers */}
              <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
                {WEEKDAYS.map((d, i) => (
                  <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
                  </div>
                ))}
              </div>

              {/* Days Grid — the skeleton keeps the grid's exact footprint so
                  the page does not jump between months. */}
              <div
                className="grid grid-cols-7 gap-1.5 sm:gap-2"
                aria-busy={gridState === 'loading'}
              >
                {gridState === 'loading'
                  ? Array.from({ length: 35 }, (_, i) => (
                      <div
                        key={`skeleton-${i}`}
                        className="min-h-[76px] animate-pulse rounded-md border border-border bg-muted/40 sm:min-h-[104px]"
                      />
                    ))
                  : renderCells()}
              </div>
            </>
          )}
        </SectionCard>

        {/* Detail Panel (Right Column) */}
        {selectedCalDay ? (
          <SectionCard
            title={fmtDate(selectedDate)}
            meta={`${selectedTrades.length} ${selectedTrades.length === 1 ? 'trade' : 'trades'}`}
            actions={
              <Button variant="ghost" size="sm" onClick={() => setSelectedCalDay(null)}>
                Close
              </Button>
            }
          >
            <div className="flex flex-col gap-4">
              <StatCard
                label="Net P&L"
                value={formatSigned(selectedTotal)}
                tone={selectedTotal > 0.01 ? 'positive' : selectedTotal < -0.01 ? 'negative' : 'neutral'}
                hint={`${selectedTrades.length} ${selectedTrades.length === 1 ? 'execution' : 'executions'}`}
              />

              {/* Day metrics */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Lots" value={formatNumber(selectedLots, 2)} />
                <StatCard label="Win rate" value={`${selectedDayWinRate.toFixed(0)}%`} />
                <StatCard label="Pips" value={selectedPipsValue} />
              </div>

              {/* Executions */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">Executions</p>
                <ul className="flex max-h-[280px] flex-col overflow-y-auto">
                  {selectedTrades.map((trade, idx) => {
                    return (
                      <li
                        key={trade.id || idx}
                        className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
                      >
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-xs text-foreground">
                            <DirectionCell direction={trade.direction} />
                            <span className="text-muted-foreground"> · XAU/USD</span>
                          </span>
                          <span className="truncate font-mono text-[11px] text-muted-foreground">
                            {trade.setup || 'Direct execution'}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className={cn('figure text-xs', pnlToneClass(trade.pnl))}>
                            {formatSigned(trade.pnl)}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">{trade.session || '—'}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </SectionCard>
        ) : (
          /* Monthly analytics view */
          <SectionCard title="Monthly analytics">
            <div className="flex flex-col gap-4">

              {/* Consistency */}
              <div>
                <p className="text-xs font-medium text-muted-foreground">Consistency</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="figure text-2xl font-medium leading-none tracking-tight text-foreground">
                    {consistencyRate.toFixed(0)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {winDays} of {activeDays} trading days green
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-sm bg-muted">
                  <div className="h-full rounded-sm bg-foreground" style={{ width: `${consistencyRate}%` }} />
                </div>
              </div>

              {/* Setups Breakdown */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">Best setups</p>
                {sortedSetups.length > 0 ? (
                  <div className="flex flex-col">
                    {sortedSetups.map((setup) => (
                      <div key={setup.name} className="flex flex-col gap-1.5 border-b border-border py-2.5 first:pt-0 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm text-foreground">{setup.name}</span>
                          <span className={cn('figure text-xs', pnlTone(setup.pnl))}>
                            {formatSigned(setup.pnl)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1 flex-1 rounded-sm bg-muted">
                            <div className="h-full rounded-sm bg-foreground" style={{ width: `${setup.winRate}%` }} />
                          </div>
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {setup.winRate.toFixed(0)}% win
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No setups recorded" className="py-4" />
                )}
              </div>

              {/* Session Performance */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">Session performance</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(sessionStats).map(([name, data]) => (
                    <div key={name} className="flex flex-col gap-1 rounded-md border border-border bg-card p-3">
                      <span className="text-xs font-medium text-muted-foreground">{SESSION_LABELS[name] || name}</span>
                      <span
                        className={cn(
                          'figure text-sm',
                          data.count > 0 ? pnlTone(data.pnl) : 'text-muted-foreground'
                        )}
                      >
                        {data.count > 0 ? formatSigned(data.pnl, 0) : '—'}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {data.count} {data.count === 1 ? 'trade' : 'trades'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coach tip */}
              <div className="rounded-md border border-border bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground">Tip</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground">{smartTip}</p>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
