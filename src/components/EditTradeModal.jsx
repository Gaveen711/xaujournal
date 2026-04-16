import { useState, useEffect } from 'react';
import { XLg, Check2Circle } from 'react-bootstrap-icons';
import { CustomSelect } from './ui/CustomSelect';
import { DatePicker } from './ui/DatePicker';
import { calcPnl } from '../lib/tradeUtils';

export function EditTradeModal({ trade, onSave, onClose }) {
  const [formData, setFormData] = useState({ ...trade });
  const [direction, setDirection] = useState(trade.direction);
  const [session, setSession] = useState(trade.session || '');
  const [setup, setSetup] = useState(trade.setup || '');
  const [date, setDate] = useState(trade.date);

  useEffect(() => {
    // Re-calculate P&L and Pips dynamically
    const res = calcPnl(
      parseFloat(formData.entry) || 0,
      parseFloat(formData.exit) || 0,
      parseFloat(formData.lots) || 0,
      0,
      parseFloat(formData.sl) || null,
      parseFloat(formData.tp) || null,
      direction,
      'GOLD',
      parseFloat(formData.swap) || 0
    );
    
    setFormData(prev => ({
      ...prev,
      pnl: parseFloat(res.pnl.toFixed(2)),
      pips: res.pips,
      rr: res.rr,
      outcome: res.pnl > 0.01 ? 'WIN' : res.pnl < -0.01 ? 'LOSS' : 'BE'
    }));
  }, [formData.entry, formData.exit, formData.lots, formData.swap, formData.sl, formData.tp, direction]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(trade.id, {
      ...formData,
      direction,
      session,
      setup,
      date
    });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl card-premium p-6 sm:p-10 space-y-8 animate-in zoom-in-95 slide-in-from-bottom-8 duration-700">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gradient uppercase tracking-tight">Modify Operation</h2>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-relaxed">Adjusting intelligence log for operation #{trade.id.slice(-6)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all active:scale-90">
            <XLg className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground/70 ml-1">Date</label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground/70 ml-1">Session</label>
              <CustomSelect 
                value={session} 
                onChange={setSession}
                options={[
                  { value: 'Asian', label: 'Asian' },
                  { value: 'London', label: 'London' },
                  { value: 'NY', label: 'New York' },
                  { value: 'LN-NY', label: 'London–NY' }
                ]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground/70 ml-1">Setup</label>
              <CustomSelect 
                value={setup} 
                onChange={setSetup}
                options={[
                  { value: 'A+ Setup', label: 'A+ Setup' },
                  { value: 'Breakout', label: 'Breakout' },
                  { value: 'Reversal', label: 'Reversal' },
                  { value: 'News', label: 'News' },
                  { value: 'Trend', label: 'Trend' }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground/70 ml-1">Direction</label>
              <div className="flex bg-muted rounded-xl p-1 gap-1 border border-border/50 h-11">
                <button 
                  type="button"
                  onClick={() => setDirection('BUY')}
                  className={`flex-1 rounded-lg text-xs font-black transition-all ${direction === 'BUY' ? 'bg-green-500 text-white shadow-lg' : 'hover:bg-background text-muted-foreground hover:text-foreground'}`}
                >BUY</button>
                <button 
                  type="button"
                  onClick={() => setDirection('SELL')}
                  className={`flex-1 rounded-lg text-xs font-black transition-all ${direction === 'SELL' ? 'bg-red-500 text-white shadow-lg' : 'hover:bg-background text-muted-foreground hover:text-foreground'}`}
                >SELL</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground/70 ml-1">Lot Size</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.lots} 
                onChange={e => setFormData({ ...formData, lots: e.target.value })}
                className="input-premium h-11 text-sm font-bold" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground/70 ml-1">Entry Price</label>
              <input 
                type="number" 
                step="0.00001"
                value={formData.entry} 
                onChange={e => setFormData({ ...formData, entry: e.target.value })}
                className="input-premium h-11 text-sm font-bold" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground/70 ml-1">Exit Price</label>
              <input 
                type="number" 
                step="0.00001"
                value={formData.exit} 
                onChange={e => setFormData({ ...formData, exit: e.target.value })}
                className="input-premium h-11 text-sm font-bold" 
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-muted/40 border border-border/50 flex justify-between items-center animate-in slide-in-from-top-2">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Recalculated Impact</span>
              <span className={`text-xl font-black ${formData.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formData.pnl >= 0 ? '+' : ''}${Math.abs(formData.pnl).toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">Efficiency</span>
              <span className="text-sm font-black text-foreground">{formData.pips} Pips {formData.rr ? `· R:R ${formData.rr}` : ''}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/70 ml-1">Notes</label>
            <textarea 
              value={formData.note} 
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              className="input-premium h-24 resize-none text-xs leading-relaxed p-4 w-full" 
            />
          </div>

          <button type="submit" className="w-full btn-primary h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Check2Circle className="w-4 h-4" />
            Update Operation Log
          </button>
        </form>
      </div>
    </div>
  );
}
