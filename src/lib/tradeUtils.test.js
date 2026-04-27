import { describe, it, expect } from 'vitest';
import { calcPnl } from './tradeUtils';

describe('Trade Logic (calcPnl)', () => {
  it('calculates correct P&L for a BUY trade (diff * lots * 100)', () => {
    // BUY 1 lot at 2000, exit at 2010. Diff = 10.
    // PNL = 10 * 1 * 100 = 1000
    const result = calcPnl(2000, 2010, 1, null, null, null, 'BUY');
    expect(result.pnl).toBe(1000);
    expect(result.pips).toBe(100); // (2010 - 2000) / 0.1 = 10 / 0.1 = 100
  });

  it('calculates correct P&L for a SELL trade (diff * lots * 100)', () => {
    // SELL 0.5 lot at 2010, exit at 2000. Diff = 10.
    // PNL = 10 * 0.5 * 100 = 500
    const result = calcPnl(2010, 2000, 0.5, null, null, null, 'SELL');
    expect(result.pnl).toBe(500);
    expect(result.pips).toBe(100); // (2010 - 2000) / 0.1 = 10 / 0.1 = 100
  });

  it('calculates correct P&L for a losing BUY trade', () => {
    // BUY 2 lots at 2010, exit at 2000. Diff = -10.
    // PNL = -10 * 2 * 100 = -2000
    const result = calcPnl(2010, 2000, 2, null, null, null, 'BUY');
    expect(result.pnl).toBe(-2000);
    expect(result.pips).toBe(100); 
  });

  it('calculates correct P&L with swap applied', () => {
    // BUY 1 lot at 2000, exit at 2010. Diff = 10. Swap = -5
    // PNL = (10 * 1 * 100) + (-5) = 995
    const result = calcPnl(2000, 2010, 1, null, null, null, 'BUY', 'GOLD', -5);
    expect(result.pnl).toBe(995);
    expect(result.swap).toBe(-5);
  });

  it('trusts actual broker PNL if provided over calculation', () => {
    // Even if diff is large, if actual broker PNL is given, use it + swap
    const result = calcPnl(2000, 2010, 1, 950, null, null, 'BUY', 'GOLD', -10);
    expect(result.pnl).toBe(940); // 950 + -10
  });

  it('calculates Risk:Reward ratio correctly', () => {
    // BUY at 2000. SL at 1990 (Risk = 10). TP at 2020 (Reward = 20).
    // RR = 20 / 10 = 2.0
    const result = calcPnl(2000, 2010, 1, null, 1990, 2020, 'BUY');
    expect(result.rr).toBe(2);
  });
});
