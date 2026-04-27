export const pad2 = n => String(n).padStart(2, '0');

export const todayStr = () => {
  const today = new Date();
  return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
};

export const formatCompact = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  
  if (absVal >= 1000000) {
    return sign + (absVal / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (absVal >= 10000) {
    return sign + (absVal / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return sign + absVal.toFixed(2).replace(/\.00$/, '');
};

export const formatCurrencyCompact = (val) => {
  const formatted = formatCompact(val);
  if (formatted === '—') return '—';
  if (formatted.startsWith('-')) {
    return `-$${formatted.substring(1)}`;
  }
  return `$${formatted}`;
};

// XAUUSD only: 1 pip = $1.00 per 0.01 lot (contract size 100, pip size 0.1)
const XAUUSD_CONTRACT_SIZE = 100;
const XAUUSD_PIP_SIZE      = 0.1;

export const calcPnl = (entry, exit, lots, actualPnl, sl, tp, dir = null, _market = 'GOLD', swap = 0) => {
  if (!entry || !exit || !dir) return { pnl: null, rr: null, pips: null };

  const diff    = dir === 'BUY' ? exit - entry : entry - exit;
  const absDiff = Math.abs(exit - entry);
  const pips    = parseFloat((absDiff / XAUUSD_PIP_SIZE).toFixed(1));

  // If actual broker P&L is provided, trust it directly
  let pnl;
  if (actualPnl !== null && actualPnl !== undefined && !isNaN(actualPnl) && actualPnl !== 0) {
    pnl = parseFloat(actualPnl) + parseFloat(swap || 0);
  } else if (lots && !isNaN(lots) && lots > 0) {
    pnl = (diff * lots * XAUUSD_CONTRACT_SIZE) + parseFloat(swap || 0);
  } else {
    return { pnl: null, rr: null, pips };
  }

  let rr = null;
  if (sl && tp) {
    const risk   = Math.abs(dir === 'BUY' ? entry - sl : sl - entry);
    const reward = Math.abs(dir === 'BUY' ? tp - entry : entry - tp);
    if (risk > 0) rr = parseFloat((reward / risk).toFixed(2));
  }

  return {
    pnl:  parseFloat(pnl.toFixed(2)),
    rr,
    pips,
    swap: parseFloat((swap || 0).toFixed(2))
  };
};

export const storage = {
  async get(key, defaultValue = null) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : defaultValue;
    } catch { return defaultValue; }
  },
  async set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  },
  async remove(key) {
    localStorage.removeItem(key);
    return true;
  }
};
