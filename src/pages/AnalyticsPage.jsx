import { useOutletContext } from 'react-router-dom';
import { BarChartLine } from 'react-bootstrap-icons';

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

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const currentWalletBalance = (startingBalance || 0) + totalPnl;
  const winRatePercent = trades.length ? (wins.length / trades.length * 100).toFixed(0) : 0;

  const monthMap = {};
  trades.forEach(t => {
    const key = t.date.substring(0, 7);
    monthMap[key] = (monthMap[key] || 0) + t.pnl;
  });
  const months = Object.keys(monthMap).sort().reverse();
  const maxAbs = months.length ? Math.max(...months.map(m => Math.abs(monthMap[m]))) : 1;

  const statCards = [
    { label: 'Wallet Balance', value: `$${currentWalletBalance.toFixed(2)}`, sub: 'Current Liquidity', color: 'text-primary' },
    { label: 'Win Rate', value: `${winRatePercent}%`, sub: `${wins.length} successful`, color: 'text-green-500' },
    { label: 'Expectancy', value: trades.length ? `${expectancy >= 0 ? '+' : ''}$${expectancy.toFixed(2)}` : '—', sub: 'Average per trade', color: expectancy > 0 ? 'text-green-500' : expectancy < 0 ? 'text-red-500' : '' },
    { label: 'Avg Win', value: wins.length ? `+$${avgWin.toFixed(2)}` : '—', sub: `${wins.length} winners`, color: 'text-green-500' },
    { label: 'Avg Loss', value: losses.length ? `-$${Math.abs(avgLoss).toFixed(2)}` : '—', sub: `${losses.length} losers`, color: 'text-red-500' },
    { label: 'Profit Factor', value: pf !== null ? pf.toFixed(2) : '—', sub: 'Gross Profit / Loss', color: pf >= 1.5 ? 'text-green-500' : pf < 1 ? 'text-red-500' : '' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-1">
        <h1 className="text-3xl font-black text-gradient uppercase tracking-tight">Intelligence Ledger</h1>
        <p className="text-muted-foreground text-sm font-medium">Quantify your edge and identify weaknesses in the system.</p>
      </header>
      
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((stat, i) => (
          <div 
            key={i} 
            className="card-premium p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-32 group hover:scale-[1.03] active:scale-95 transition-all duration-500 ease-[var(--spring-bounce)] animate-in zoom-in-90 fill-both"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/85 group-hover:text-primary transition-colors">{stat.label}</span>
            <div className="space-y-1">
              <div className={`text-xl sm:text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-foreground/90 font-black uppercase tracking-tighter truncate">{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-premium p-6 sm:p-8 animate-in slide-in-from-bottom-4 duration-700 delay-500">
        <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          Monthly Performance Signals
        </h3>
        <div className="space-y-5">
          {months.length ? months.map((month, idx) => {
            const value = monthMap[month];
            const percent = Math.abs(value) / maxAbs * 100;
            const label = new Date(`${month}-01`).toLocaleString('default', { month: 'short', year: '2-digit' });
            return (
              <div key={month} className="group animate-in slide-in-from-right-4 duration-700" style={{ animationDelay: `${700 + (idx * 100)}ms` }}>
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-foreground">{label}</span>
                  <span className={`text-sm font-black tracking-tight ${value >= 0 ? 'text-green-500 shadow-green-500/20' : 'text-red-500 shadow-red-500/20'}`}>
                    {value >= 0 ? '+' : ''}${Math.abs(value).toFixed(0)}
                  </span>
                </div>
                <div className="h-4 w-full bg-muted/30 rounded-full overflow-hidden border border-border/40 shadow-inner p-[2px]">
                  <div 
                    className={`h-full rounded-full transition-all duration-1500 ease-[var(--apple-ease)] ${value >= 0 ? 'bg-gradient-to-r from-green-500/80 to-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-gradient-to-r from-red-500/80 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'}`} 
                    style={{ width: `${Math.max(4, percent)}%` }}
                  ></div>
                </div>
              </div>
            );
          }) : (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-6">
              <div className="w-20 h-20 rounded-[2rem] bg-muted/50 border border-border/50 flex items-center justify-center shadow-inner rotate-6">
                <BarChartLine className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <div className="text-center space-y-1">
                <span className="text-sm font-bold text-foreground uppercase tracking-tight">No Monthly Logs Identified</span>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/75 leading-relaxed px-8">Initialize operations to begin synthesizing monthly performance curves.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


