import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { calcPnl, todayStr, formatCompact, formatCurrencyCompact } from '../lib/tradeUtils';
import { useToast } from '../components/ToastContext';
import { ArrowUpRight, ArrowDownRight, BarChartLine } from 'react-bootstrap-icons';
import { DatePicker } from '../components/ui/DatePicker';
import { CustomSelect } from '../components/ui/CustomSelect';
import { RiskCalculator } from '../components/RiskCalculator';
import { Calculator, CurrencyExchange } from 'react-bootstrap-icons';
import { CurrencyConverter } from '../components/CurrencyConverter';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export function LogTradePage() {
  const { 
    trades, addTrade, setShowPricingModal, startingBalance, updateBalance, 
    plan, totalTrades, resetTrades, resetWallet, monthlyGoal, updateMonthlyGoal 
  } = useOutletContext();
  const toast = useToast();
  


  const TRADE_LIMIT = 50;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const thisMonthTradesCount = trades.filter(t => t.date >= monthStart).length;
  const isLimitReached = plan === 'free' && thisMonthTradesCount >= TRADE_LIMIT;

  const [direction, setDirection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showRiskCalc, setShowRiskCalc] = useState(false);
  const [equityPeriod, setEquityPeriod] = useState('all');

  const [date, setDate] = useState(todayStr());
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [lots, setLots] = useState('0.10');
  const [swap, setSwap] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [note, setNote] = useState('');
  const [leverage, setLeverage] = useState('');
  const [session, setSession] = useState('');
  const [setup, setSetup] = useState('');
  const pnlData = calcPnl(
    parseFloat(entry) || 0, parseFloat(exit) || 0,
    parseFloat(lots) || 0, 0,
    parseFloat(sl) || 0, parseFloat(tp) || 0,
    direction, 'GOLD', parseFloat(swap) || 0
  );

  const saveTradeForm = async (e) => {
    e.preventDefault();
    
    if (isLimitReached) {
      setShowPricingModal(true);
      toast(`Monthly limit reached (${TRADE_LIMIT} trades). Access will reset next month, or upgrade now for unlimited logs.`, 'warn');
      return;
    }

    setSaving(true);
    const formData = new FormData(e.target);
    const date = formData.get('date');
    const entryVal = parseFloat(formData.get('entry'));
    const exitVal = parseFloat(formData.get('exit'));
    const lotsVal = parseFloat(formData.get('lots')) || 0;
    const swapVal = parseFloat(formData.get('swap')) || 0;
    const slVal = parseFloat(formData.get('sl')) || null;
    const tpVal = parseFloat(formData.get('tp')) || null;
    const noteVal = formData.get('note').trim();
    const leverageVal = formData.get('leverage');

    if (!date || !direction || isNaN(entryVal) || isNaN(exitVal) || isNaN(lotsVal)) {
      toast('Please complete all required fields.', 'error');
      setSaving(false);
      return;
    }

    const tradeRes = calcPnl(entryVal, exitVal, lotsVal, 0, slVal, tpVal, direction, 'GOLD', swapVal);
    const { pnl, pips, rr } = tradeRes;
    const outcome = pnl > 0.01 ? 'WIN' : pnl < -0.01 ? 'LOSS' : 'BE';

    const tradeData = {
      date, direction, entry: entryVal, exit: exitVal, lots: lotsVal, swap: swapVal, sl: slVal, tp: tpVal, rr, pips, session, setup, market: 'GOLD', leverage: leverageVal,
      pnl: parseFloat(pnl.toFixed(2)), outcome, note: noteVal, timestamp: new Date()
    };

    try {
      await addTrade(tradeData);
      e.target.reset();
      setDirection(null);
      setDate(todayStr());
      setEntry(''); setExit(''); setLots('0.10'); setSwap(''); setSl(''); setTp(''); setNote(''); setLeverage(''); setSession(''); setSetup('');
      toast(`Trade recorded: ${outcome} ${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`, outcome === 'WIN' ? 'success' : outcome === 'LOSS' ? 'error' : 'warn');
    } catch (error) {
      toast('Failed to record trade. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onApplyRisk = (calcLots, calcSlPips) => {
    setLots(calcLots.toString());
    // Calculate SL Price based on entry if available
    if (entry && direction) {
      const entryPrice = parseFloat(entry);
      // Gold: 1 pip = 0.10. 
      const slDist = calcSlPips * 0.1;
      const calculatedSl = direction === 'BUY' ? entryPrice - slDist : entryPrice + slDist;
      setSl(calculatedSl.toFixed(2));
    }
    setShowRiskCalc(false);
    toast('Risk intelligence applied.', 'success');
  };

  const sortedForChart = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  
  let chartVisibleTrades = sortedForChart;
  let initialBalanceForChart = startingBalance || 0;

  if (equityPeriod === '30') {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    chartVisibleTrades = sortedForChart.filter(t => t.date >= cutoffStr);
    
    // Calculate the cumulative pnl of all trades BEFORE the 30-day window
    const olderTrades = sortedForChart.filter(t => t.date < cutoffStr);
    initialBalanceForChart += olderTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  }

  const chartLabels = ['Start', ...chartVisibleTrades.map(t => t.date)];
  let currentBalance = initialBalanceForChart;
  const chartDataPoints = [currentBalance, ...chartVisibleTrades.map(t => {
    currentBalance += t.pnl;
    return parseFloat(currentBalance.toFixed(2));
  })];

  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: 'Equity',
      data: chartDataPoints,
      borderColor: '#8B5CF6',
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
        return gradient;
      },
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6,
      borderWidth: 3,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false }, 
      tooltip: { 
        backgroundColor: 'rgba(13, 13, 20, 0.9)',
        titleColor: '#94a3b8',
        bodyColor: '#f1f5f9',
        padding: 12,
        borderRadius: 8,
        displayColors: false,
        mode: 'index', 
        intersect: false 
      } 
    },
    scales: { 
      x: { display: false },
      y: { 
        grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, 
        ticks: { color: '#64748b', font: { size: 10 } } 
      }
    }
  };

  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempBalance, setTempBalance] = useState(startingBalance || 0);
  const [tempGoal, setTempGoal] = useState(monthlyGoal || 1000);
  const [isWiping, setIsWiping] = useState(false);

  useEffect(() => {
    setTempBalance(startingBalance || 0);
  }, [startingBalance]);

  const handleSaveBalance = async () => {
    await updateBalance(parseFloat(tempBalance) || 0);
    setIsEditingBalance(false);
    toast("Wallet initialized.", "success");
  };

  const handleSaveGoal = async () => {
    await updateMonthlyGoal(parseFloat(tempGoal) || 0);
    setIsEditingGoal(false);
    toast("Monthly objective updated.", "success");
  };

  const handleWipeTerminal = async () => {
    try {
      await resetTrades();
      await updateBalance(0);
      setIsEditingBalance(true);
      setIsWiping(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast("Terminal wiped. Setup new balance.", "warn");
    } catch (e) {
      toast("Failed to reset terminal: " + e.message, "error");
    }
  };

  useEffect(() => {
    let timer;
    if (isWiping) {
        timer = setTimeout(() => setIsWiping(false), 5000);
    }
    return () => clearTimeout(timer);
  }, [isWiping]);

  const totalPnl = chartVisibleTrades.reduce((s,t)=> s + (t.pnl || 0), 0);
  const currentWalletBalance = (startingBalance || 0) + trades.reduce((s,t)=> s + (t.pnl || 0), 0);
  const winRate = chartVisibleTrades.length ? (chartVisibleTrades.filter(t => t.outcome === 'WIN').length / chartVisibleTrades.length * 100).toFixed(0) : 0;

  const thisMonthTrades = trades.filter(t => t.date >= monthStart);
  const thisMonthPnl = thisMonthTrades.reduce((s,t) => s + (t.pnl || 0), 0);
  const goalProgress = Math.min(100, Math.max(0, (thisMonthPnl / (monthlyGoal || 1)) * 100));

  const wins = chartVisibleTrades.filter(t => (t.pnl || 0) > 0);
  const losses = chartVisibleTrades.filter(t => (t.pnl || 0) < 0);
  const avgProfit = wins.length ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length : 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gradient uppercase tracking-tight">Performance Terminal</h1>
          <p className="text-muted-foreground text-sm font-medium">Welcome back, Agent. Analyze your market impact.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto">
          <div className="card-premium p-4 flex flex-col gap-1 min-w-[150px] bg-muted/30 relative group overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Wallet Balance</span>
              {plan === 'pro' && !isEditingBalance && (
                <button 
                  onClick={() => setIsEditingBalance(true)}
                  className="text-[9px] font-black uppercase text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:underline"
                >
                  Deposit
                </button>
              )}
            </div>
            
            {isEditingBalance ? (
              <div className="flex gap-2 items-center animate-in slide-in-from-right-2 duration-300">
                <input 
                  type="number"
                  value={tempBalance}
                  onChange={e => setTempBalance(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveBalance()}
                  autoFocus
                  className="bg-background/50 border border-primary/40 rounded-lg px-2 py-1 text-sm font-black w-full focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={handleSaveBalance} className="text-[10px] font-black text-primary uppercase hover:scale-110 active:scale-95 transition-all">Save</button>
              </div>
            ) : (
              <span className="text-xl font-black">{formatCurrencyCompact(currentWalletBalance)}</span>
            )}
            
            {/* Pulsing light for pro users when balance is active */}
            {plan === 'pro' && <div className="absolute top-0 right-0 w-1 h-full bg-primary/20 animate-pulse" />}
          </div>
          <div className="card-premium p-4 flex flex-col gap-1 min-w-[120px] bg-muted/30">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Win Rate</span>
            <span className="text-xl font-black">{winRate}%</span>
          </div>

          <div className="card-premium p-4 flex flex-col gap-2 min-w-[200px] bg-muted/30 relative overflow-hidden group">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Objective Progress</span>
              <button 
                onClick={() => setIsEditingGoal(true)}
                className="text-[9px] font-black uppercase text-primary opacity-0 group-hover:opacity-100 transition-all hover:underline"
              >
                Target
              </button>
            </div>
            
            <div className="flex justify-between items-center">
              {isEditingGoal ? (
                <div className="flex gap-2 items-center w-full animate-in slide-in-from-right-2">
                  <input 
                    type="number"
                    value={tempGoal}
                    onChange={e => setTempGoal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveGoal()}
                    autoFocus
                    className="bg-background/50 border border-primary/40 rounded-lg px-2 py-0.5 text-xs font-black w-full"
                  />
                  <button onClick={handleSaveGoal} className="text-[9px] font-black text-primary uppercase">Set</button>
                </div>
              ) : (
                <>
                  <span className={`text-xl font-black ${thisMonthPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrencyCompact(thisMonthPnl)} <span className="text-[10px] text-muted-foreground">/ {formatCurrencyCompact(monthlyGoal)}</span>
                  </span>
                  <span className="text-[10px] font-black text-primary">{goalProgress.toFixed(0)}%</span>
                </>
              )}
            </div>

            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/20 shadow-inner">
              <div 
                className={`h-full transition-all duration-1000 ease-[var(--apple-ease)] ${thisMonthPnl >= monthlyGoal ? 'bg-gradient-to-r from-green-500 to-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-primary'}`} 
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          {plan === 'free' && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex justify-between items-center group animate-in zoom-in-95 duration-500 delay-150">
              <div className="space-y-1">
                <h3 className="font-bold text-primary">Unlock Pro Access</h3>
                <p className="text-xs text-primary/90">Advanced intelligence & unlimited logs.</p>
              </div>
              <button 
                onClick={() => setShowPricingModal(true)}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                Upgrade
              </button>
            </div>
          )}
          
          <div className="card-premium p-8 sm:p-10 space-y-8 animate-in slide-in-from-left-4 duration-700 delay-100">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                New Operation
              </h3>
              <button 
                type="button"
                onClick={() => setShowRiskCalc(!showRiskCalc)}
                className={`p-2 rounded-xl border transition-all active:scale-95 ${showRiskCalc ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-muted/30 border-border/40 text-foreground/40 hover:text-primary hover:border-primary/40'}`}
              >
                <Calculator className="w-4 h-4" />
              </button>
            </div>

            {showRiskCalc && (
              <div className="animate-in slide-in-from-top-4 duration-500">
                <RiskCalculator balance={currentWalletBalance} onApply={onApplyRisk} onClose={() => setShowRiskCalc(false)} />
              </div>
            )}

            <form onSubmit={saveTradeForm} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Date</label>
                  <DatePicker name="date" value={date} onChange={setDate} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Market</label>
                  <div className="h-12 rounded-xl border border-border/50 bg-muted/30 flex items-center px-4 gap-2 overflow-hidden whitespace-nowrap">
                    <span className="text-[11px] font-black text-primary">XAU/USD</span>
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">· Gold</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Session</label>
                  <CustomSelect 
                    name="session" 
                    value={session} 
                    onChange={setSession}
                    options={[
                      { value: 'Sydney', label: 'Sydney' },
                      { value: 'Tokyo', label: 'Tokyo' },
                      { value: 'London', label: 'London' },
                      { value: 'NewYork', label: 'NewYork' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Direction</label>
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Setup</label>
                  <CustomSelect 
                    name="setup" 
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Leverage</label>
                  <CustomSelect 
                    name="leverage" 
                    value={leverage} 
                    onChange={setLeverage}
                    options={[
                      { value: '1:1', label: '1:1' },
                      { value: '1:10', label: '1:10' },
                      { value: '1:30', label: '1:30' },
                      { value: '1:50', label: '1:50' },
                      { value: '1:100', label: '1:100' },
                      { value: '1:200', label: '1:200' },
                      { value: '1:500', label: '1:500' },
                      { value: '1:1000', label: '1:1000' },
                      { value: '1:2000', label: '1:2000' },
                      { value: '1:3000', label: '1:3000' },
                      { value: '1:Unlimited', label: '1:Unlimited' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/90 ml-1">Entry Price</label>
                  <input type="number" name="entry" step="0.00001" value={entry} onChange={e => setEntry(e.target.value)} className="input-premium h-12 text-sm font-bold" placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/90 ml-1">Exit Price</label>
                  <input type="number" name="exit" step="0.00001" value={exit} onChange={e => setExit(e.target.value)} className="input-premium h-12 text-sm font-bold" placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/90 ml-1">Lot Size</label>
                  <input type="number" name="lots" step="0.01" value={lots} onChange={e => setLots(e.target.value)} className="input-premium h-12 text-sm font-bold" placeholder="0.10" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/90 ml-1">Stop Loss</label>
                  <input type="number" name="sl" step="0.00001" value={sl} onChange={e => setSl(e.target.value)} className="input-premium h-12 text-sm font-bold" placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/90 ml-1">Take Profit</label>
                  <input type="number" name="tp" step="0.00001" value={tp} onChange={e => setTp(e.target.value)} className="input-premium h-12 text-sm font-bold" placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/90 ml-1">Swap / Fees ($)</label>
                  <input type="number" name="swap" step="0.01" value={swap} onChange={e => setSwap(e.target.value)} className="input-premium h-12 text-sm font-bold" placeholder="0.00" />
                </div>

              </div>

              {pnlData.pnl !== null && (
                <div className="p-4 rounded-2xl bg-muted/50 border border-border shadow-inner flex justify-between items-center animate-in slide-in-from-top-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                      Forecasted Impact ({pnlData.pips} Pips)
                    </span>
                    <span className={`text-xl font-black ${pnlData.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {pnlData.pnl >= 0 ? '+' : ''}${Math.abs(pnlData.pnl).toFixed(2)}
                    </span>
                  </div>
                  {pnlData.rr && (
                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-tight ${pnlData.rr >= 2 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                      R:R {pnlData.rr}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Intelligence Brief</label>
                <textarea name="note" value={note} onChange={e => setNote(e.target.value)} className="input-premium h-24 resize-none text-xs leading-relaxed p-4" placeholder="Market conditions, emotional state, pattern recognized..."></textarea>
              </div>

              {plan === 'free' && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    <span>Operation Limit</span>
                    <span>{thisMonthTradesCount} / {TRADE_LIMIT} Logs</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/30 shadow-inner">
                    <div 
                      className={`h-full transition-all duration-1000 ease-[var(--apple-ease)] ${isLimitReached ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-primary'}`} 
                      style={{ width: `${(thisMonthTradesCount / TRADE_LIMIT) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={saving} 
                className={`btn-primary w-full h-12 text-sm font-black tracking-widest uppercase shadow-xl active:scale-95 transition-all ${isLimitReached ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
              >
                {saving ? 'Processing Signal...' : isLimitReached ? 'Limit Exceeded' : 'Authorize Log'}
              </button>
            </form>
          </div>
        </div>
        
        <div className="lg:col-span-12 xl:col-span-7 space-y-8 animate-in slide-in-from-right-4 duration-700 delay-200">
          <div className="card-premium p-6 sm:p-8 h-[400px] sm:h-[550px] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                Equity Intelligence
              </h3>
              <CustomSelect 
                className="min-w-[140px] h-9"
                value={equityPeriod} 
                onChange={setEquityPeriod}
                options={[
                  { value: 'all', label: 'Full Profile' },
                  { value: '30', label: '30D Snapshot' }
                ]}
              />
            </div>
            <div className="flex-1 w-full min-h-0 relative z-10">
                {trades.length > 0 ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-6">
                    <div className="w-16 h-16 rounded-[2rem] bg-muted/50 border border-border/50 flex items-center justify-center shadow-inner rotate-3 hover:rotate-0 transition-transform duration-500">
                      <BarChartLine className="w-7 h-7 text-muted-foreground/40" />
                    </div>
                    <div className="text-center space-y-1">
                      <span className="text-sm font-bold text-foreground opacity-80">No Intel Data Available</span>
                      <p className="text-[10px] uppercase tracking-widest opacity-40 px-8 leading-relaxed">Log operations to begin analyzing your performance curve.</p>
                    </div>
                  </div>
                )}
            </div>
            {/* Background Glow */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="card-premium p-6 flex items-center justify-between group hover:border-green-500/30 transition-all duration-500">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Avg Growth</span>
                <p className="text-2xl font-black text-green-500 tracking-tighter">
                  +{avgProfit === 0 ? '$0.00' : `$${avgProfit.toFixed(2)}`}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-green-500/5 flex items-center justify-center text-green-500 text-xl shadow-inner group-hover:scale-110 group-hover:bg-green-500/10 transition-all duration-500 ease-[var(--spring-bounce)]">
                <ArrowUpRight className="w-6 h-6" />
              </div>
            </div>
            <div className="card-premium p-6 flex items-center justify-between group hover:border-red-500/30 transition-all duration-500">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Avg Drawdown</span>
                <p className="text-2xl font-black text-red-500 tracking-tighter">
                  {avgLoss === 0 ? '$0.00' : `-$${Math.abs(avgLoss).toFixed(2)}`}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-red-500/5 flex items-center justify-center text-red-500 text-xl shadow-inner group-hover:scale-110 group-hover:bg-red-500/10 transition-all duration-500 ease-[var(--spring-bounce)]">
                <ArrowDownRight className="w-6 h-6" />
              </div>
            </div>
          </div>

          <CurrencyConverter />
        </div>
      </div>

      {/* PRO RESET OPTION */}
      {plan === 'pro' && (
        <div className="pt-12 pb-8 flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-500">
          <button 
            onClick={() => isWiping ? handleWipeTerminal() : setIsWiping(true)}
            className={`px-8 h-10 border text-[9px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-500 active:scale-95 ${
              isWiping 
                ? 'bg-destructive/10 text-destructive border-destructive/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                : 'bg-muted/30 border-border/40 text-foreground/30 hover:text-foreground/50 hover:bg-muted/50'
            }`}
          >
            {isWiping ? 'Confirm Wipe?' : 'Reset Terminal'}
          </button>
        </div>
      )}
    </div>
  );
}



