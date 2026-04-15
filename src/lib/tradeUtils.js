export const pad2 = n => String(n).padStart(2, '0');

export const todayStr = () => {
  const today = new Date();
  return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
};

// XAUUSD only: 1 pip = $0.10 per 0.01 lot (contract size 100, pip size 0.01)
const XAUUSD_CONTRACT_SIZE = 100;
const XAUUSD_PIP_SIZE      = 0.01;

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
