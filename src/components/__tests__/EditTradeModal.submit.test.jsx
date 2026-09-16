// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditTradeModal } from '../EditTradeModal';

// firestore.rules is the actual contract this payload must satisfy, so the test
// reads the allowlist from the rules file rather than restating it. A field
// added to the payload but not to the rules fails here, instead of in
// production as a silent PERMISSION_DENIED the user sees as "Failed to update".
const RULES = readFileSync('firestore.rules', 'utf8');

/** The trades match block, so a clause from another collection can never match. */
function tradesBlock() {
  const start = RULES.indexOf('match /trades/{tradeId}');
  const end = RULES.indexOf('match /journals/{journalId}');
  expect(start, 'trades block not found in firestore.rules').toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return RULES.slice(start, end);
}

/** Line comments are prose, and prose contains quotes; strip before harvesting. */
const stripComments = (text) => text.replace(/\/\/[^\n]*/g, '');

function rulesTradeAllowlist() {
  const block = stripComments(tradesBlock())
    .match(/function clientWritableTradeFields\(\)\s*\{\s*return\s*\[([\s\S]*?)\]\s*;/);
  expect(block, 'clientWritableTradeFields() not found in firestore.rules').not.toBeNull();
  return new Set([...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
}

// ── The rules engine, in miniature ───────────────────────────────────────────
// No emulator in this suite, so the two semantics that decide a synced edit are
// mirrored here: `request.resource.data` on an update is the POST-MERGE
// document, and `diff().affectedKeys()` is the set of keys whose value actually
// changed (added, removed, or altered).
const postMerge = (stored, patch) => ({ ...stored, ...patch });

function affectedKeys(stored, patch) {
  const merged = postMerge(stored, patch);
  const keys = new Set([...Object.keys(stored), ...Object.keys(merged)]);
  return [...keys].filter((key) => JSON.stringify(stored[key]) !== JSON.stringify(merged[key]));
}

/** The rules' own expectedPnl formula, character for character. */
function absPnlDiff(doc) {
  const num = (value, fallback) => (typeof value === 'number' ? value : fallback);
  const entry = num(doc.entry, 0);
  const exit = num(doc.exit, 0);
  const lots = num(doc.lots, 0);
  const swap = num(doc.swap, 0);
  const diff = doc.direction === 'BUY' ? exit - entry : entry - exit;
  return Math.abs(num(doc.pnl, 0) - ((diff * lots * 100) + swap));
}

// A broker-synced trade carries server-owned fields that `{ ...trade }` used to
// leak into the payload, getting the whole write rejected.
const SERVER_OWNED = ['netPnl', 'positionId', 'accountId', 'openPrice', 'closeTime', 'commission', 'status'];

// Every key api/_metaapi-broker.js normalizeDeal emits, plus the five
// api/_brokerTradePersistence.ts stamps on top (accountId, syncedAt, updatedAt,
// createdAt, sessionResolvedAt). This is the document the edit has to merge
// into — none of it is client-writable, and the rule must not require it to be.
// `id` is the exception: it is not stored, it is grafted on at read time by
// FirebaseTradeRepository (`{ id: item.id, ...item.data() }`).
const syncedTrade = {
  id: 'broker_acct_1_88213',
  positionId: 'pos_991',
  closeDealTicket: '88213',
  symbol: 'XAUUSD',
  direction: 'BUY',
  type: 'buy',
  lots: 0.1,
  closePrice: 2410.5,
  openPrice: 2400.5,
  closeTime: '2026-08-19T12:00:00.000Z',
  openTime: '2026-08-19T09:30:00.000Z',
  date: '2026-08-19',
  pnl: 100,
  commission: -1.6,
  swap: -0.42,
  netPnl: 97.98,
  pips: 100,
  status: 'closed',
  source: 'BROKER_METAAPI',
  brokerType: 'mt5',
  brokerServer: 'ICMarkets-Live',
  market: 'GOLD',
  outcome: 'WIN',
  entryTimestampUtc: '2026-08-19T09:30:00.000Z',
  sessionCode: 'London',
  sessionSource: 'broker',
  sessionEngineVersion: 1,
  accountId: 'acct_1',
  syncedAt: { seconds: 1755600000, nanoseconds: 0 },
  updatedAt: { seconds: 1755600000, nanoseconds: 0 },
  createdAt: { seconds: 1755600000, nanoseconds: 0 },
  sessionResolvedAt: { seconds: 1755600000, nanoseconds: 0 },
};

// FirebaseTradeRepository.editTrade widens the form payload with the re-resolved
// session tag before transaction.update(), so the patch the rules actually see
// is this, not the payload alone (see resolveEditedSession).
const withRepositorySessionStamp = (payload) => ({
  ...payload,
  entryTimestampUtc: syncedTrade.entryTimestampUtc,
  sessionCode: 'London',
  sessionSource: 'broker',
  sessionEngineVersion: 1,
  sessionResolvedAt: { seconds: 1755690000, nanoseconds: 0 },
});

function renderModal(trade, onSave) {
  render(
    <EditTradeModal
      trade={trade}
      plan="pro"
      setShowPricingModal={() => {}}
      onSave={onSave}
      onClose={() => {}}
    />,
  );
  return screen.getByRole('button', { name: /update operation log/i });
}

async function submitEdit(trade = syncedTrade) {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const submit = renderModal(trade, onSave);
  await user.click(submit);
  expect(onSave).toHaveBeenCalledTimes(1);
  return { onSave, payload: onSave.mock.calls[0][1] };
}

describe('EditTradeModal submit payload', () => {
  it('sends no server-owned fields when editing a broker-synced trade', async () => {
    const { payload } = await submitEdit();
    SERVER_OWNED.forEach((field) => expect(payload).not.toHaveProperty(field));
  });

  it('sends only fields the firestore.rules allowlist accepts', async () => {
    const { payload } = await submitEdit();
    const allowed = rulesTradeAllowlist();
    expect(Object.keys(payload).filter((key) => !allowed.has(key))).toEqual([]);
  });

  it('coerces typed numeric input to numbers, since the rules require `is number`', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const submit = renderModal(syncedTrade, onSave);

    // Typing leaves raw strings in form state; the payload must not carry them.
    const lots = screen.getByDisplayValue('0.1');
    await user.clear(lots);
    await user.type(lots, '0.25');
    await user.click(submit);

    const payload = onSave.mock.calls[0][1];
    expect(payload.lots).toBe(0.25);
    ['entry', 'exit', 'lots', 'swap', 'pnl'].forEach((field) => {
      expect(typeof payload[field], `${field} must be a number`).toBe('number');
    });
  });

  it('never emits undefined, which Firestore rejects outright', async () => {
    const { payload } = await submitEdit({ ...syncedTrade, sl: null, tp: null });
    Object.entries(payload).forEach(([key, value]) => {
      expect(value, `${key} must not be undefined`).not.toBeUndefined();
    });
  });

  // Regression: a synced document stores its prices as openPrice/closePrice, so
  // the form used to load with two empty price inputs and calcPnl's `!entry`
  // guard turned every synced edit into pnl 0 / pips 0 / outcome BE. Denied by
  // the rules before, so invisible; silent data loss once they let it through.
  it('seeds entry/exit from openPrice/closePrice, so a synced edit keeps its P&L', async () => {
    const { payload } = await submitEdit();

    expect(payload.entry).toBe(2400.5);
    expect(payload.exit).toBe(2410.5);
    // (2410.5 − 2400.5) × 0.1 lots × 100 oz + (−0.42) swap
    expect(payload.pnl).toBeCloseTo(99.58, 2);
    expect(payload.pips).toBe(100);
    expect(payload.outcome).toBe('WIN');
  });
});

describe('firestore.rules — editing a broker-synced trade', () => {
  it('accepts the edit: every affected key is client-writable', async () => {
    const { payload } = await submitEdit();
    const patch = withRepositorySessionStamp(payload);
    const allowed = rulesTradeAllowlist();

    const touched = affectedKeys(syncedTrade, patch);
    expect(touched.length).toBeGreaterThan(0);
    expect(touched.filter((key) => !allowed.has(key))).toEqual([]);
  });

  it('leaves every server-owned field on the merged document untouched', async () => {
    const { payload } = await submitEdit();
    const merged = postMerge(syncedTrade, withRepositorySessionStamp(payload));

    ['netPnl', 'commission', 'accountId', 'positionId', 'closeDealTicket', 'syncedAt', 'createdAt', 'status']
      .forEach((key) => expect(merged[key], `${key} must survive the edit`).toEqual(syncedTrade[key]));
  });

  it('still satisfies the absPnlDiff integrity check on the merged document', async () => {
    const { payload } = await submitEdit();
    const merged = postMerge(syncedTrade, withRepositorySessionStamp(payload));
    expect(absPnlDiff(merged)).toBeLessThan(1.0);
  });

  // This is the live bug, pinned. The post-merge document is NOT client-shaped
  // and never can be, so an update rule written as keys().hasOnly() denies every
  // synced edit. Making it pass would mean admitting netPnl — the value
  // tradePnlValue prefers over pnl, and the one the absPnlDiff check does not
  // constrain.
  it('cannot be expressed as a post-merge key allowlist', async () => {
    const { payload } = await submitEdit();
    const merged = postMerge(syncedTrade, withRepositorySessionStamp(payload));
    const allowed = rulesTradeAllowlist();
    const serverKeys = Object.keys(merged).filter((key) => !allowed.has(key));

    expect(serverKeys).toEqual(expect.arrayContaining(['netPnl', 'commission', 'accountId', 'syncedAt']));
    expect(tradesBlock()).toMatch(
      /allow update:[\s\S]*?request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\s*\.hasOnly\(clientWritableTradeFields\(\)\)/,
    );
  });

  it('never admits a field that feeds reported P&L', () => {
    const allowed = rulesTradeAllowlist();
    ['netPnl', 'commission'].forEach((field) => expect(allowed.has(field)).toBe(false));
  });

  it('keeps client trade creation closed until server ingestion owns the cooldown', () => {
    const block = tradesBlock();
    expect(block).toMatch(/allow create:\s*if false/);
    expect(block).not.toContain('lastTradeTime');
  });
});
