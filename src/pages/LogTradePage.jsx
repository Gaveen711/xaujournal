import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { calcPnl, todayStr } from '../lib/tradeUtils';
import { useToast } from '../components/ToastContext';
import { ArrowUpRight, ArrowDownRight, BarChartLine } from 'react-bootstrap-icons';
import { DatePicker } from '../components/ui/DatePicker';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export function LogTradePage() {
  const { trades, addTrade, setShowPricingModal, startingBalance, plan } = useOutletContext();
  const toast = useToast();
  
  const TRADE_LIMIT = 5;
  const usedTrades = trades.length;
  const isLimitReached = plan === 'free' && usedTrades >= TRADE_LIMIT;

  const [direction, setDirection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [equityPeriod, setEquityPeriod] = useState('all');

  const [date, setDate] = useState(todayStr());
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [lots, setLots] = useState('0.10');
  const [amount, setAmount] = useState('');
  const [swap, setSwap] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [note, setNote] = useState('');
  const [leverage, setLeverage] = useState('');
  const [market, setMarket] = useState('GOLD');

  const pnlData = calcPnl(
    parseFloat(entry) || 0, parseFloat(exit) || 0,
    parseFloat(lots) || 0, parseFloat(amount) || 0,
    parseFloat(sl) || 0, parseFloat(tp) || 0,
    direction, market, parseFloat(swap) || 0
  );

  const saveTradeForm = async (e) => {
    e.preventDefault();
    
    if (isLimitReached) {
      setShowPricingModal(true);
      toast(`Free plan limit reached (${TRADE_LIMIT} trades). Please upgrade to Pro Version.`, 'warn');
      return;
    }

    setSaving(true);
    const formData = new FormData(e.target);
    const date = formData.get('date');
    const entryVal = parseFloat(formData.get('entry'));
    const exitVal = parseFloat(formData.get('exit'));
    const lotsVal = parseFloat(formData.get('lots')) || 0;
    const amountVal = parseFloat(formData.get('amount')) || 0;
    const swapVal = parseFloat(formData.get('swap')) || 0;
    const slVal = parseFloat(formData.get('sl')) || null;
    const tpVal = parseFloat(formData.get('tp')) || null;
    const noteVal = formData.get('note').trim();
    const session = formData.get('session');
    const setup = formData.get('setup');
    const marketVal = formData.get('market');
    const leverageVal = formData.get('leverage');

    if (!date || !direction || isNaN(entryVal) || isNaN(exitVal) || (!amountVal && isNaN(lotsVal))) {
      toast('Please fill in date, direction, prices and lot size.', 'error');
      setSaving(false);
      return;
    }

    const tradeRes = calcPnl(entryVal, exitVal, lotsVal, amountVal, slVal, tpVal, direction, marketVal, swapVal);
    const { pnl, pips, rr } = tradeRes;
    const outcome = pnl > 0.01 ? 'WIN' : pnl < -0.01 ? 'LOSS' : 'BE';

    const tradeData = {
      date, direction, entry: entryVal, exit: exitVal, lots: isNaN(lotsVal) ? 0 : lotsVal, amount: amountVal, swap: swapVal, sl: slVal, tp: tpVal, rr, pips, session, setup, market: marketVal, leverage: leverageVal,
      pnl: parseFloat(pnl.toFixed(2)), outcome, note: noteVal, timestamp: new Date()
    };

    try {
      await addTrade(tradeData);
      e.target.reset();
      setDirection(null);
      setDate(todayStr());
      setEntry(''); setExit(''); setLots('0.10'); setAmount(''); setSwap(''); setSl(''); setTp(''); setNote(''); setLeverage('');
      const icon = outcome === 'WIN' ? '🟢' : outcome === 'LOSS' ? '🔴' : '🟡';
      toast(`${icon} Trade saved — ${outcome} ${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`, outcome === 'WIN' ? 'success' : outcome === 'LOSS' ? 'error' : 'warn');
    } catch (error) {
      toast('Failed to save trade — ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const sortedForChart = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  const chartLabels = ['Start', ...sortedForChart.map(t => t.date)];
  let currentBalance = startingBalance || 0;
  const chartDataPoints = [currentBalance, ...sortedForChart.map(t => {
    currentBalance += t.pnl;
    return parseFloat(currentBalance.toFixed(2));
  })];

  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: 'Equity',
      data: chartDataPoints,
      borderColor: 'hsl(262.1, 83.3%, 57.8%)',
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(170, 59, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(170, 59, 255, 0)');
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

  const totalPnl = trades.reduce((s,t)=>s+t.pnl,0);
  const currentWalletBalance = (startingBalance || 0) + totalPnl;
  const winRate = trades.length ? (trades.filter(t => t.outcome === 'WIN').length / trades.length * 100).toFixed(0) : 0;

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const avgProfit = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gradient uppercase tracking-tight">Performance Terminal</h1>
          <p className="text-muted-foreground text-sm font-medium">Welcome back, Agent. Analyze your market impact.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto">
          <div className="card-premium p-4 flex flex-col gap-1 min-w-[120px] bg-muted/30">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Wallet Balance</span>
            <span className="text-xl font-black">${currentWalletBalance.toFixed(2)}</span>
          </div>
          <div className="card-premium p-4 flex flex-col gap-1 min-w-[120px] bg-muted/30">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Win Rate</span>
            <span className="text-xl font-black">{winRate}%</span>
          </div>
          <div className="card-premium p-4 flex flex-col gap-1 min-w-[120px] bg-muted/30">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Absolute P&L</span>
            <span className={`text-xl font-black ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toFixed(0)}
            </span>
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
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              New Operation
            </h3>
            <form onSubmit={saveTradeForm} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Date</label>
                  <DatePicker name="date" value={date} onChange={setDate} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Market</label>
                  <select name="market" value={market} onChange={e => setMarket(e.target.value)} className="select-premium h-12">
                    <option value="GOLD">Gold (XAU/USD)</option>
                    <option value="FOREX">Forex</option>
                    <option value="CRYPTO">Crypto</option>
                    <option value="STOCKS">Stocks / Indices</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Session</label>
                  <select name="session" className="select-premium h-12">
                    <option value="">Select...</option>
                    <option value="Asian">Asian</option>
                    <option value="London">London</option>
                    <option value="NY">New York</option>
                    <option value="LN-NY">London–NY</option>
                  </select>
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
                  <select name="setup" className="select-premium h-12">
                    <option value="">Select...</option>
                    <option value="A+ Setup">A+ Setup</option>
                    <option value="Breakout">Breakout</option>
                    <option value="Reversal">Reversal</option>
                    <option value="News">News</option>
                    <option value="Trend">Trend</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Leverage</label>
                  <input type="text" name="leverage" value={leverage} onChange={e => setLeverage(e.target.value)} className="input-premium h-12 text-sm font-bold" placeholder="e.g. 1:Unlimited" />
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
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/90 ml-1">Risk Amt ($)</label>
                  <input type="number" name="amount" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="input-premium h-12 text-sm font-bold" placeholder="0.00" />
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
                    <span>{usedTrades} / {TRADE_LIMIT} Logs</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/30 shadow-inner">
                    <div 
                      className={`h-full transition-all duration-1000 ease-[var(--apple-ease)] ${isLimitReached ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-primary'}`} 
                      style={{ width: `${(usedTrades / TRADE_LIMIT) * 100}%` }}
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
              <select 
                className="select-premium min-w-[140px] text-[10px] font-black uppercase tracking-widest h-9" 
                value={equityPeriod} 
                onChange={e => setEquityPeriod(e.target.value)}
              >
                <option value="all">Full Profile</option>
                <option value="30">30D Snapshot</option>
              </select>
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
        </div>
      </div>
    </div>
  );
}



