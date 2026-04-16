import { useState, useEffect } from 'react';
import { CalculatorFill, LightningFill, XLg } from 'react-bootstrap-icons';

export function RiskCalculator({ balance, onApply, onClose }) {
  const [riskPercent, setRiskPercent] = useState(1);
  const [slPips, setSlPips] = useState(20); // standard 20 pip sl for gold scalp
  const [contractSize, setContractSize] = useState(100); // Standard Gold contract
  const [calculatedLots, setCalculatedLots] = useState(0);
  const [riskAmount, setRiskAmount] = useState(0);

  useEffect(() => {
    const amount = (balance * (riskPercent / 100));
    setRiskAmount(amount);
    
    // Position Size = (Amount at Risk) / (SL Pips * Pip Value)
    // For Gold: 1 Lot = 100oz. 1 pip (0.10) for 1 lot = $10.
    // Lot Size = Risk Amount / (Sl Pips * 10)
    const lots = amount / (slPips * 10);
    setCalculatedLots(parseFloat(lots.toFixed(2)));
  }, [balance, riskPercent, slPips, contractSize]);

  return (
    <div className="card-premium p-6 sm:p-8 space-y-6 animate-in slide-in-from-right-4 duration-500 relative group overflow-hidden border-primary/20 bg-primary/5">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
            <CalculatorFill className="w-4 h-4" />
            Risk Intelligence
          </h3>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Precision Lot & Risk Sizing</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-all">
            <XLg className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="flex justify-between text-[9px] font-black uppercase tracking-widest text-foreground/70 ml-1">
            <span>Risk Percentage</span>
            <span className="text-primary">{riskPercent}%</span>
          </label>
          <input 
            type="range" 
            min="0.1" 
            max="10" 
            step="0.1" 
            value={riskPercent} 
            onChange={e => setRiskPercent(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary" 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-foreground/70 ml-1">SL Pips</label>
            <input 
              type="number" 
              value={slPips} 
              onChange={e => setSlPips(parseFloat(e.target.value) || 0)}
              className="input-premium h-10 text-xs font-bold" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-foreground/70 ml-1">Account</label>
            <div className="h-10 rounded-xl bg-muted/30 border border-border/40 flex items-center px-3 text-[10px] font-black text-foreground/80">
              ${balance?.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-background/50 border border-border/40 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Recommended Log</span>
            <span className="text-lg font-black text-primary">{calculatedLots} Lots</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">Exposure</span>
            <span className="text-xs font-black text-foreground">${riskAmount.toFixed(2)}</span>
          </div>
        </div>

        {onApply && (
          <button 
            onClick={() => onApply(calculatedLots, slPips)}
            className="w-full h-10 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
          >
            <LightningFill className="w-3 h-3" />
            Apply to Signal Log
          </button>
        )}
      </div>
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
    </div>
  );
}
