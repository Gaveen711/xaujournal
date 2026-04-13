export const pad2 = n => String(n).padStart(2, '0');

export const todayStr = () => {
  const today = new Date();
  return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
};

const MARKET_CONFIGS = {
  GOLD: { CONTRACT_SIZE: 100, PIP_SIZE: 0.01 },
  FOREX: { CONTRACT_SIZE: 100000, PIP_SIZE: 0.0001 },
  DEFAULT: { CONTRACT_SIZE: 1, PIP_SIZE: 1 }
};

export const calcPnl = (entry, exit, lots, amount, sl, tp, dir = null, market = 'GOLD', swap = 0) => {
  if (!entry || !exit || !dir || (!lots && !amount)) return { pnl: null, rr: null, pips: null };
  
  const config = MARKET_CONFIGS[market] || MARKET_CONFIGS.DEFAULT;
  const { CONTRACT_SIZE, PIP_SIZE } = config;

  const diff = dir === 'BUY' ? exit - entry : entry - exit;
  const absDiff = Math.abs(exit - entry);
  
  const pips = absDiff / PIP_SIZE;
  let pnl = (diff * lots * CONTRACT_SIZE) + swap;

  // Handle manual amount-based P&L if lots are not used
  if (amount > 0 && !lots) {
    pnl = (diff / entry) * amount + swap;
  }

  let rr = null;
  if (sl && tp) {
    const risk = Math.abs(dir === 'BUY' ? entry - sl : sl - entry);
    const reward = Math.abs(dir === 'BUY' ? tp - entry : entry - tp);
    if (risk > 0) rr = parseFloat((reward / risk).toFixed(2));
  }
  
  return { 
    pnl: parseFloat(pnl.toFixed(2)), 
    rr, 
    pips: Math.round(pips),
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
  }
};
