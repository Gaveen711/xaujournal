export const pad2 = n => String(n).padStart(2, '0');

export const todayStr = () => {
  const today = new Date();
  return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
};

export const calcPnl = (entry, exit, lots, amount, sl, tp, dir = null) => {
  if (!entry || !exit || !dir || (!lots && !amount)) return { pnl: null, rr: null, risk: null, reward: null };
  const diff = dir === 'BUY' ? exit - entry : entry - exit;
  const pnl = amount > 0 ? (diff / entry) * amount : diff * lots * 100;
  let rr = null, risk = null, reward = null;
  if (sl && tp) {
    risk = Math.abs(dir === 'BUY' ? entry - sl : sl - entry);
    reward = Math.abs(dir === 'BUY' ? tp - entry : entry - tp);
    if (risk > 0) rr = parseFloat((reward / risk).toFixed(2));
  }
  return { pnl: parseFloat(pnl.toFixed(2)), rr, risk, reward };
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
