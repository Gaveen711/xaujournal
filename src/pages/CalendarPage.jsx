import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { pad2 } from '../lib/tradeUtils';
import { ChevronLeft, ChevronRight, Calendar3 } from 'react-bootstrap-icons';

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
          className={`relative aspect-square rounded-[1.5rem] sm:rounded-[2rem] transition-all duration-500 flex flex-col items-center justify-center gap-2 border group ${
            isSelected ? 'ring-2 ring-primary border-primary shadow-[0_0_30px_rgba(139,92,246,0.4)] scale-110 z-10 bg-primary/10' : 
            hasTrades ? (isWin ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10 hover:border-green-500/40 hover:scale-105' : isLoss ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 hover:scale-105' : 'bg-muted/50 border-border hover:bg-muted hover:scale-105') :
            'bg-muted/10 border-transparent hover:bg-muted/30 hover:scale-105'
          }`}
          onClick={() => setSelectedCalDay(d)}
        >
          <span className={`text-sm sm:text-base font-black transition-all duration-500 group-hover:scale-110 ${isToday ? 'bg-primary text-white w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full shadow-lg shadow-primary/40' : isSelected ? 'text-primary' : 'text-foreground/90'}`}>
            {d}
          </span>
          {hasTrades && (
            <div className={`text-[10px] sm:text-[12px] font-black tracking-tighter transition-all duration-300 ${isWin ? 'text-green-500' : isLoss ? 'text-red-500' : 'text-muted-foreground'}`}>
              {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(0)}
            </div>
          )}
          {isSelected && <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary animate-ping" />}
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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-gradient uppercase tracking-tight">Consistency Terminal</h1>
            {plan === 'free' && (
              <span className="px-2 py-0.5 rounded-md bg-primary/5 border border-primary/20 text-[9px] font-black uppercase tracking-widest text-primary shadow-sm">
                Basic Edition
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm font-medium">Visualize your daily market impact and discipline.</p>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-full border border-border/40 shadow-inner w-full sm:w-auto justify-between sm:justify-start">
          <button onClick={() => changeMonth(-1)} className="p-2.5 hover:bg-background rounded-full transition-all active:scale-90 flex items-center justify-center">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="px-4 py-2 text-[10px] font-black min-w-[140px] text-center uppercase tracking-[0.2em] self-center text-foreground/90">
            {new Date(calYear, calMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2.5 hover:bg-background rounded-full transition-all active:scale-90 flex items-center justify-center">
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card-premium p-6 sm:p-12 animate-in slide-in-from-left-4 duration-700">
          <div className="grid grid-cols-7 gap-2 sm:gap-6 mb-8">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 sm:gap-6">
            {renderCells().map((cell, idx) => (
              <div 
                key={idx} 
                className="animate-in zoom-in-90 duration-500 fill-both"
                style={{ animationDelay: `${idx * 15}ms` }}
              >
                {cell}
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-8 border-t border-border/30 flex flex-wrap gap-x-6 gap-y-3 text-[10px] uppercase font-black tracking-widest text-muted-foreground/80">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md bg-green-500/10 border border-green-500/30"></div> Profit Day</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md bg-red-500/10 border border-red-500/30"></div> Loss Day</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md bg-muted/50 border border-border/50"></div> No Operations</div>
          </div>
        </div>

        <div className="card-premium p-6 sm:p-8 h-fit shadow-xl shadow-primary/5 animate-in slide-in-from-right-4 duration-700 delay-200">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            Intelligence Feed
          </h3>
          {selectedCalDay ? (
            <div className="space-y-6">
              <div className="p-5 rounded-[2rem] bg-muted/40 border border-border/50 shadow-inner space-y-3 animate-in fade-in zoom-in-95 duration-700">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-foreground/90 uppercase tracking-[0.2em]">{fmtDate(selectedDate)}</span>
                  <div className={`w-2 h-2 rounded-full ${selectedTotal >= 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
                </div>
                <div className="flex justify-between items-end text-foreground/90">
                  <div className="flex flex-col">
                    <span className="text-2xl font-black tracking-tighter text-foreground">${Math.abs(selectedTotal).toFixed(2)}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground/85">{selectedTotal >= 0 ? 'Net Profit' : 'Net Loss'}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-background/50 border border-border/50">
                    {selectedTrades.length} Signals
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {selectedTrades.map((trade, idx) => (
                  <div 
                    key={trade.id} 
                    className="flex items-center justify-between p-4 rounded-[1.5rem] border border-border/40 hover:bg-muted/30 transition-all group animate-in slide-in-from-bottom-2 duration-700"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-transform group-hover:rotate-12 ${trade.direction === 'BUY' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                        {trade.direction[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-foreground tracking-tight">{trade.market || 'GOLD'}</span>
                        <span className="text-[9px] font-black text-muted-foreground/85 uppercase tracking-[0.1em]">{trade.setup || 'Direct Execution'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-black ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.pnl >= 0 ? '+' : '-'}${Math.abs(trade.pnl).toFixed(2)}
                      </span>
                      <span className="text-[8px] font-black text-muted-foreground/60 uppercase">{trade.session}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-5 h-full">
              <div className="w-20 h-20 rounded-[2.5rem] bg-muted/50 border border-border/50 flex items-center justify-center shadow-inner rotate-3 hover:rotate-0 transition-transform duration-500 cursor-default">
                <Calendar3 className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <div className="text-center space-y-1 px-4">
                <span className="text-sm font-bold text-foreground opacity-80 uppercase tracking-tight">Select Operation Date</span>
                <p className="text-[10px] uppercase tracking-widest opacity-40 leading-relaxed">Intercept calendar signals to view performance intelligence.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



