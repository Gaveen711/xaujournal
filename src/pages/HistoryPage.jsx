import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

const HistorySkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex gap-4 mb-8">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-10 bg-muted rounded-lg w-full"></div>
      ))}
    </div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-20 bg-muted rounded-2xl w-full"></div>
      ))}
    </div>
  </div>
);

export function HistoryPage() {
  const { trades, isLoadingTrades, removeTrade } = useOutletContext();
  const toast = useToast();
  
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterSetup, setFilterSetup] = useState('');
  const [filterSort, setFilterSort] = useState('newest');
  
  const [expandedNotes, setExpandedNotes] = useState({});

  if (isLoadingTrades) return <HistorySkeleton />;

  let filtered = [...trades].filter(t => {
    if (filterSearch && !t.note?.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    if (filterDir && t.direction !== filterDir) return false;
    if (filterOutcome && t.outcome !== filterOutcome) return false;
    if (filterSession && t.session !== filterSession) return false;
    if (filterSetup && t.setup !== filterSetup) return false;
    return true;
  });

  if (filterSort === 'oldest') filtered.sort((a, b) => a.date.localeCompare(b.date));
  else if (filterSort === 'best') filtered.sort((a, b) => b.pnl - a.pnl);
  else if (filterSort === 'worst') filtered.sort((a, b) => a.pnl - b.pnl);

  const onExportCSV = () => {
    if (!trades.length) return toast('No trades to export.', 'warn');
    const headers = ['Date', 'Direction', 'Entry', 'Exit', 'P&L', 'Session', 'Setup', 'Outcome', 'Note'];
    const rows = trades.map(t => [
      t.date, t.direction, t.entry, t.exit, t.pnl, t.session, t.setup, t.outcome, `"${(t.note || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trading_journal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('CSV exported.', 'success');
  };

  const onDeleteTrade = async (id) => {
    if (confirm('Delete this trade?')) {
      await removeTrade(id);
      toast('Trade deleted.', 'warn');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gradient">Trade History</h1>
          <p className="text-muted-foreground text-sm">A comprehensive log of your past performance.</p>
        </div>
        <button onClick={onExportCSV} className="btn-secondary gap-2 text-xs">
          <span>↓</span> Export Data
        </button>
      </header>
      
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={filterSearch} 
            onChange={e => setFilterSearch(e.target.value)} 
            className="input-premium lg:col-span-1"
          />
          <select value={filterDir} onChange={e => setFilterDir(e.target.value)} className="input-premium">
            <option value="">All directions</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          <select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)} className="input-premium">
            <option value="">All outcomes</option>
            <option value="WIN">WIN</option>
            <option value="LOSS">LOSS</option>
            <option value="BE">Breakeven</option>
          </select>
          <select value={filterSession} onChange={e => setFilterSession(e.target.value)} className="input-premium">
            <option value="">All sessions</option>
            <option value="Asian">Asian</option>
            <option value="London">London</option>
            <option value="NY">New York</option>
            <option value="LN-NY">London–NY</option>
          </select>
          <select value={filterSetup} onChange={e => setFilterSetup(e.target.value)} className="input-premium">
            <option value="">All setups</option>
            <option value="A+ Setup">A+ Setup</option>
            <option value="Breakout">Breakout</option>
            <option value="Reversal">Reversal</option>
            <option value="News">News</option>
            <option value="Trend">Trend</option>
          </select>
          <select value={filterSort} onChange={e => setFilterSort(e.target.value)} className="input-premium">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="best">Best P&L</option>
            <option value="worst">Worst P&L</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="card-premium p-12 text-center text-muted-foreground italic flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">🔍</div>
            No trades match the current filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(t => (
              <div 
                key={t.id} 
                className="card-premium p-4 cursor-pointer group hover:bg-muted/30" 
                onClick={() => setExpandedNotes(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
              >
                <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                  <div className={`w-14 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-widest ${t.direction === 'BUY' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    {t.direction}
                  </div>
                  
                  <div className="flex flex-col min-w-[100px]">
                    <span className="text-xs font-bold">{t.date}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{t.session} · {t.setup}</span>
                  </div>

                  <div className="flex flex-col min-w-[120px]">
                    <span className="text-xs font-medium font-mono">{t.entry} → {t.exit}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{t.lots} Lots · ${t.amount || 0}</span>
                  </div>

                  <div className="ml-auto flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-black ${t.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {t.pnl >= 0 ? '+' : '-'}${Math.abs(t.pnl).toFixed(2)}
                      </span>
                      {t.rr && <span className="text-[10px] text-muted-foreground">RR {t.rr}</span>}
                    </div>
                    <button 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100" 
                      onClick={e => { e.stopPropagation(); onDeleteTrade(t.id); }}
                    >×</button>
                  </div>
                </div>
                
                {expandedNotes[t.id] && (
                  <div className="mt-4 pt-4 border-t border-border/50 animate-in slide-in-from-top-2 duration-300">
                    <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {t.note || <span className="text-muted-foreground italic">No notes provided for this trade.</span>}
                    </div>
                    {t.screenshots && t.screenshots.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {t.screenshots.map((s, i) => (
                          <div key={i} className="rounded-lg border border-border overflow-hidden bg-muted">
                            <img src={s} alt="screenshot" className="max-w-[200px] hover:scale-105 transition-transform cursor-zoom-in" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
      </div>
    </div>
  );
}

