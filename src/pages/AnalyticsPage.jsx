import { useOutletContext } from 'react-router-dom';

const AnalyticsSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-24 bg-muted rounded-2xl"></div>
      ))}
    </div>
    <div className="h-64 bg-muted rounded-2xl"></div>
  </div>
);

export function AnalyticsPage() {
  const { trades, isLoadingTrades, startingBalance } = useOutletContext();
  
  if (isLoadingTrades) return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black text-gradient">Analytics</h1>
      </header>
      <AnalyticsSkeleton />
    </div>
  );

  const wins = trades.filter(t => t.outcome === 'WIN');
  const losses = trades.filter(t => t.outcome === 'LOSS');
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const wr = trades.length ? wins.length / trades.length : 0;
  const expectancy = (wr * avgWin) + ((1 - wr) * avgLoss);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const pf = grossLoss > 0 ? grossWin / grossLoss : null;
  const rrTrades = trades.filter(t => t.rr);
  const avgRR = rrTrades.length ? rrTrades.reduce((s, t) => s + t.rr, 0) / rrTrades.length : null;

  let peak = startingBalance || 0, maxDD = 0, running = startingBalance || 0;
  [...trades].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
    running += t.pnl;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  });

  const monthMap = {};
  trades.forEach(t => {
    const key = t.date.substring(0, 7);
    monthMap[key] = (monthMap[key] || 0) + t.pnl;
  });
  const months = Object.keys(monthMap).sort().reverse();
  const maxAbs = months.length ? Math.max(...months.map(m => Math.abs(monthMap[m]))) : 1;

  const statCards = [
    { label: 'Expectancy', value: trades.length ? `${expectancy >= 0 ? '+' : ''}$${expectancy.toFixed(2)}` : '—', sub: 'Average per trade', color: expectancy > 0 ? 'text-green-500' : expectancy < 0 ? 'text-red-500' : '' },
    { label: 'Avg Win', value: wins.length ? `+$${avgWin.toFixed(2)}` : '—', sub: `${wins.length} winners`, color: 'text-green-500' },
    { label: 'Avg Loss', value: losses.length ? `-$${Math.abs(avgLoss).toFixed(2)}` : '—', sub: `${losses.length} losers`, color: 'text-red-500' },
    { label: 'Profit Factor', value: pf !== null ? pf.toFixed(2) : '—', sub: 'Gross Profit / Loss', color: pf >= 1.5 ? 'text-green-500' : pf < 1 ? 'text-red-500' : '' },
    { label: 'Avg R:R', value: avgRR !== null ? avgRR.toFixed(2) : '—', sub: 'Realized Risk/Reward', color: 'text-primary' },
    { label: 'Max Drawdown', value: maxDD > 0 ? `-$${maxDD.toFixed(2)}` : '—', sub: 'Peak to valley', color: 'text-red-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-3xl font-black text-gradient">Smart Analytics</h1>
        <p className="text-muted-foreground text-sm">Quantify your edge and identify weaknesses.</p>
      </header>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="card-premium p-4 flex flex-col justify-between h-24">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
            <div className="space-y-0.5">
              <div className={`text-lg font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-[9px] text-muted-foreground font-medium uppercase truncate">{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-premium p-8">
        <h3 className="text-lg font-bold mb-8">Monthly Performance</h3>
        <div className="space-y-4">
          {months.length ? months.map(month => {
            const value = monthMap[month];
            const percent = Math.abs(value) / maxAbs * 100;
            const label = new Date(`${month}-01`).toLocaleString('default', { month: 'short', year: '2-digit' });
            return (
              <div key={month} className="group">
                <div className="flex justify-between items-center mb-1.5 px-1">
                  <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
                  <span className={`text-xs font-black ${value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {value >= 0 ? '+' : ''}${Math.abs(value).toFixed(0)}
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border/30 shadow-inner p-[1px]">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${value >= 0 ? 'bg-gradient-to-r from-green-500/80 to-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-gradient-to-r from-red-500/80 to-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`} 
                    style={{ width: `${Math.max(2, percent)}%` }}
                  ></div>
                </div>
              </div>
            );
          }) : (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground italic gap-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">📊</div>
              No monthly data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

