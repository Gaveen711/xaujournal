import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { pad2 } from '../lib/tradeUtils';

export function CalendarPage() {
  const { trades, plan } = useOutletContext();
  
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedCalDay, setSelectedCalDay] = useState(null);

  const formatDate = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
  const fmtDate = (dateString) => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(dateString + 'T00:00:00'));

  const dayTrades = (y, m, d) => {
    const key = formatDate(y, m, d);
    return trades.filter(t => t.date === key);
  };

  const renderCells = () => {
    const first = new Date(calYear, calMonth, 1).getDay();
    const days = new Date(calYear, calMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < first; i++) cells.push(<div key={`empty-${i}`} className="aspect-square"></div>);

    for (let d = 1; d <= days; d++) {
      const ts = dayTrades(calYear, calMonth, d);
      const pnl = ts.reduce((sum, t) => sum + t.pnl, 0);
      const hasTrades = ts.length > 0;
      const isWin = pnl > 0.01;
      const isLoss = pnl < -0.01;
      
      const todayDate = new Date();
      const isToday = d === todayDate.getDate() && calMonth === todayDate.getMonth() && calYear === todayDate.getFullYear();
      const isSelected = d === selectedCalDay;
      
      cells.push(
        <button 
          key={`day-${d}`} 
          className={`relative aspect-square rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1 border ${
            isSelected ? 'ring-2 ring-primary border-primary shadow-lg scale-105 z-10' : 
            hasTrades ? (isWin ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20' : isLoss ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20' : 'bg-muted border-border hover:bg-muted/80') :
            'bg-muted/30 border-transparent hover:bg-muted/50'
          }`}
          onClick={() => setSelectedCalDay(d)}
        >
          <span className={`text-xs font-bold ${isToday ? 'bg-primary text-white w-5 h-5 flex items-center justify-center rounded-full' : isSelected ? 'text-primary' : 'text-foreground'}`}>
            {d}
          </span>
          {hasTrades && (
            <div className={`text-[10px] font-black ${isWin ? 'text-green-500' : isLoss ? 'text-red-500' : 'text-muted-foreground'}`}>
              {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(0)}
            </div>
          )}
        </button>
      );
    }
    return cells;
  };

  const selectedTrades = selectedCalDay ? dayTrades(calYear, calMonth, selectedCalDay) : [];
  const selectedDate = selectedCalDay ? formatDate(calYear, calMonth, selectedCalDay) : '';
  const selectedTotal = selectedTrades.reduce((sum, t) => sum + t.pnl, 0);

  const changeMonth = (delta) => {
    let nextMonth = calMonth + delta, nextYear = calYear;
    if (nextMonth < 0) { nextMonth = 11; nextYear--; }
    if (nextMonth > 11) { nextMonth = 0; nextYear++; }
    setCalMonth(nextMonth);
    setCalYear(nextYear);
    setSelectedCalDay(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-gradient uppercase tracking-tight">Consistency Terminal</h1>
            {plan === 'free' && (
              <span className="px-2 py-0.5 rounded-md bg-muted border border-border/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm">
                Basic Edition
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">Visualize your daily market impact and discipline.</p>
        </div>
        <div className="flex bg-muted rounded-full p-1 border border-border/50 shadow-inner">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-background rounded-full transition-colors">‹</button>
          <span className="px-4 py-2 text-xs font-bold min-w-[140px] text-center uppercase tracking-widest self-center text-foreground/80">
            {new Date(calYear, calMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-background rounded-full transition-colors">›</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card-premium p-8">
          <div className="grid grid-cols-7 gap-1 sm:gap-4 mb-6">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-4">
            {renderCells()}
          </div>
          
          <div className="mt-8 pt-8 border-t border-border/30 flex flex-wrap gap-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500/10 border border-green-500/30"></div> Profit Day</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500/10 border border-red-500/30"></div> Loss Day</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-muted border border-border/50"></div> No Operations</div>
          </div>
        </div>

        <div className="card-premium p-8 h-fit shadow-xl shadow-primary/5">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            Intelligence Feed
            {selectedCalDay && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
          </h3>
          {selectedCalDay ? (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-muted border border-border shadow-inner space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{fmtDate(selectedDate)}</span>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground/70 uppercase tracking-tight">{selectedTrades.length} Operations</span>
                  <span className={`text-xl font-black ${selectedTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {selectedTotal >= 0 ? '+' : '-'}${Math.abs(selectedTotal).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {selectedTrades.map(trade => (
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${trade.direction === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {trade.direction}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-foreground/80">{trade.entry} → {trade.exit}</span>
                        <span className="text-[9px] font-black text-muted-foreground uppercase">{trade.setup || 'Direct Execution'}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-black ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.pnl >= 0 ? '+' : '-'}${Math.abs(trade.pnl).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-4 h-full">
              <div className="w-16 h-16 rounded-3xl bg-muted border border-border flex items-center justify-center text-2xl shadow-inner rotate-3">📅</div>
              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-foreground/80">Select Operation Date</span>
                <p className="text-[10px] uppercase tracking-widest opacity-50 px-4 leading-relaxed">Intercept calendar signals to view performance intelligence.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


