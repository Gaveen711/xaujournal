import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { Download, Search, XLg, PencilSquare } from 'react-bootstrap-icons';
import { CustomSelect } from '../components/ui/CustomSelect';
import { EditTradeModal } from '../components/EditTradeModal';

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
  const { trades, isLoadingTrades, removeTrade, editTrade, plan, setShowPricingModal } = useOutletContext();
  const toast = useToast();
  
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterSetup, setFilterSetup] = useState('');
  const [filterSort, setFilterSort] = useState('newest');
  
  const [editingTrade, setEditingTrade] = useState(null);
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
    if (plan !== 'pro') {
      setShowPricingModal(true);
      return toast('Upgrade to Pro to export your terminal data.', 'warn');
    }
    if (!trades.length) return toast('No trades to export.', 'warn');
    const headers = ['Date', 'Direction', 'Entry', 'Exit', 'P&L', 'Swap', 'Pips', 'Session', 'Setup', 'Outcome', 'Note'];
    const rows = trades.map(t => [
      t.date, t.direction, t.entry, t.exit, t.pnl, t.swap || 0, t.pips || 0, t.session, t.setup, t.outcome, `"${(t.note || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    
    // Modern Blob + URL approach for large datasets
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `trading_journal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    toast('CSV exported.', 'success');
  };

  const onSaveEdit = async (id, data) => {
    try {
      await editTrade(id, data);
      setEditingTrade(null);
      toast('Trade log updated.', 'success');
    } catch (e) {
      toast('Failed to update log.', 'error');
    }
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
          <h1 className="text-3xl font-black text-gradient">TRADE HISTORY</h1>
          <p className="text-muted-foreground text-sm font-medium">A comprehensive log of your past performance.</p>
        </div>
        <button onClick={onExportCSV} className="btn-secondary gap-2 text-[11px] font-black uppercase tracking-widest px-5 h-10">
          <Download className="w-3.5 h-3.5" /> Export Data
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
          <CustomSelect 
            value={filterDir} 
            onChange={setFilterDir}
            placeholder="All directions"
            options={[
              { value: '', label: 'All directions' },
              { value: 'BUY', label: 'BUY' },
              { value: 'SELL', label: 'SELL' }
            ]}
          />
          <CustomSelect 
            value={filterOutcome} 
            onChange={setFilterOutcome}
            placeholder="All outcomes"
            options={[
              { value: '', label: 'All outcomes' },
              { value: 'WIN', label: 'WIN' },
              { value: 'LOSS', label: 'LOSS' },
              { value: 'BE', label: 'Breakeven' }
            ]}
          />
          <CustomSelect 
            value={filterSession} 
            onChange={setFilterSession}
            placeholder="All sessions"
            options={[
              { value: '', label: 'All sessions' },
              { value: 'Asian', label: 'Asian' },
              { value: 'London', label: 'London' },
              { value: 'NY', label: 'New York' },
              { value: 'LN-NY', label: 'London–NY' }
            ]}
          />
          <CustomSelect 
            value={filterSetup} 
            onChange={setFilterSetup}
            placeholder="All setups"
            options={[
              { value: '', label: 'All setups' },
              { value: 'A+ Setup', label: 'A+ Setup' },
              { value: 'Breakout', label: 'Breakout' },
              { value: 'Reversal', label: 'Reversal' },
              { value: 'News', label: 'News' },
              { value: 'Trend', label: 'Trend' }
            ]}
          />
          <CustomSelect 
            value={filterSort} 
            onChange={setFilterSort}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'best', label: 'Best P&L' },
              { value: 'worst', label: 'Worst P&L' }
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="card-premium p-12 text-center text-muted-foreground italic flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-2 shadow-inner">
              <Search className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest opacity-40">No operations match the current filter</span>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((t, idx) => (
              <div 
                key={t.id} 
                className="card-premium p-4 sm:p-5 cursor-pointer group hover:bg-muted/30 animate-in slide-in-from-bottom-2 duration-500 ease-[var(--apple-ease)]" 
                style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                onClick={() => setExpandedNotes(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center justify-between sm:justify-start gap-4">
                    <div className={`w-14 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-widest ${t.direction === 'BUY' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                      {t.direction}
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-xs font-black tracking-tight flex items-center gap-1.5">
                        {t.date}
                        {t.source === 'MT5_AUTO' && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-green-500/10 text-green-500 border border-green-500/20">MT5</span>
                        )}
                      </span>
                      <span className="text-[10px] text-foreground/85 font-bold uppercase tracking-tighter">XAU/USD · {t.session} · {t.setup}</span>
                    </div>
                    
                    <button 
                      className="sm:hidden w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors" 
                      onClick={e => { e.stopPropagation(); onDeleteTrade(t.id); }}
                    >
                      <XLg className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between sm:justify-start gap-8 flex-1">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold font-mono text-foreground/95">{t.entry} → {t.exit}</span>
                      <span className="text-[10px] text-foreground/85 font-black uppercase tracking-widest">{t.lots} Lots · {t.pips || 0} Pips</span>
                    </div>

                    <div className="sm:ml-auto flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <span className={`text-lg sm:text-base font-black tracking-tighter ${t.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {t.pnl >= 0 ? '+' : '-'}${Math.abs(t.pnl).toFixed(2)}
                        </span>
                        <span className="text-[10px] font-black text-foreground/75 tracking-widest uppercase">
                          Swap: ${t.swap || 0} {t.rr ? `· R:R ${t.rr}` : ''}
                        </span>
                      </div>
                      
                      <button 
                        className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100 active:scale-90" 
                        onClick={e => { e.stopPropagation(); setEditingTrade(t); }}
                      >
                        <PencilSquare className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 active:scale-90" 
                        onClick={e => { e.stopPropagation(); onDeleteTrade(t.id); }}
                      >
                        <XLg className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {expandedNotes[t.id] && (
                  <div className="mt-4 pt-4 border-t border-border/40 animate-in slide-in-from-top-2 duration-500 ease-[var(--apple-ease)]">
                    <div className="text-sm font-medium text-foreground/90 leading-relaxed whitespace-pre-wrap px-1">
                      {t.note || <span className="text-muted-foreground italic font-normal">No intelligence brief provided for this operation.</span>}
                    </div>
                    {t.screenshots && t.screenshots.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {t.screenshots.map((s, i) => (
                          <div key={i} className="rounded-xl border border-border/50 overflow-hidden bg-muted/50 shadow-inner group/img">
                            <img src={s} alt="screenshot" className="max-w-[180px] sm:max-w-[240px] hover:scale-110 transition-transform duration-700 cursor-zoom-in" />
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

      {editingTrade && (
        <EditTradeModal 
          trade={editingTrade} 
          onSave={onSaveEdit} 
          onClose={() => setEditingTrade(null)} 
        />
      )}
    </div>
  );
}

