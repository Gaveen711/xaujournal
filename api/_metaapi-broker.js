// MetaApi.cloud — MT4/MT5 broker login & deal history (server-side only)

import MetaApi from 'metaapi.cloud-sdk/esm-node';
import { computePips, outcomeForPnl, isGoldSymbol } from '../src/lib/goldContract.js';
// sessionEngine.js, not goldSessions.js — goldSessions.js imports React.
import { SESSION_ENGINE_VERSION, resolveSessionAt } from '../src/lib/sessionEngine.js';

let apiClient = null;
let apiToken = null;
const HISTORY_PAGE_SIZE = 1000;
const MAX_HISTORY_PAGES = 100;
const SYNC_BUDGET_MS = 180_000;

export class BrokerSyncError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BrokerSyncError';
    this.code = code;
  }
}

function remainingSeconds(deadline) {
  const seconds = Math.floor((deadline - Date.now()) / 1000);
  if (seconds <= 0) throw new BrokerSyncError('broker-timeout', 'Broker synchronization took too long. Please retry.');
  return seconds;
}

function getApi() {
  const token = process.env.METAAPI_TOKEN;
  if (!token) {
    throw new BrokerSyncError('broker-config', 'Broker sync is not configured. Please contact support.');
  }
  if (!apiClient || apiToken !== token) {
    apiClient = new MetaApi(token, {
      requestTimeout: 20,
      connectTimeout: 20,
      retryOpts: { retries: 0, longRunningRequestTimeoutInMinutes: 1 },
    });
    apiToken = token;
  }
  return apiClient;
}

/** Map MetaApi deal → xaujournal trade document */
const finiteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const validDate = (value, fallback = new Date()) => {
  const parsed = value ? new Date(value) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const isBuyDeal = (deal) => String(deal?.type || '').toUpperCase() === 'DEAL_TYPE_BUY';
const isTradeDeal = (deal) => ['DEAL_TYPE_BUY', 'DEAL_TYPE_SELL'].includes(String(deal?.type || '').toUpperCase());

function normalizeDeal(deal, ctx, entryDeal = null) {
  const isBuy = entryDeal ? isBuyDeal(entryDeal) : !isBuyDeal(deal);
  const closeTime = validDate(deal.time);
  const price = finiteNumber(deal.price ?? deal.closePrice);
  const volume = finiteNumber(deal.volume ?? deal.lots);
  const profit = finiteNumber(deal.profit ?? deal.pnl);
  const entryFraction = entryDeal && finiteNumber(entryDeal.volume) > 0
    ? Math.min(1, volume / finiteNumber(entryDeal.volume)) : 0;
  const commission = finiteNumber(deal.commission) + finiteNumber(entryDeal?.commission) * entryFraction;
  const swap = finiteNumber(deal.swap);
  const netPnl = profit + commission + swap;
  const positionId = String(deal.positionId ?? deal.position ?? deal.id ?? deal.ticket ?? closeTime.getTime());
  const ticket = String(deal.id ?? deal.ticket ?? deal.dealId ?? `${positionId}_${closeTime.getTime()}`);
  const rawOpenPrice = entryDeal?.price ?? deal.openPrice;
  const openPrice = rawOpenPrice == null ? null : finiteNumber(rawOpenPrice, null);
  const openTime = entryDeal?.time
    ? validDate(entryDeal.time, closeTime).toISOString()
    : deal.openTime
      ? validDate(deal.openTime, closeTime).toISOString()
      : null;
  const diff = openPrice == null ? null : (isBuy ? price - openPrice : openPrice - price);
  // Gold pip math only applies to gold: a EURUSD deal on the same account
  // used to get pips wrong by orders of magnitude.
  const pips = diff == null || !isGoldSymbol(deal.symbol || 'XAUUSD') ? null : computePips(diff);
  // Canonical entry instant (§2.2): openTime, falling back to closeTime for
  // MT4 deals that carry no entry. sessionCode stays in the rules enum-or-null;
  // 'Unknown' is an analytics bucket and is never stored on a document.
  // sessionResolvedAt is stamped by persistBrokerTrades — no timestamp factory here.
  const entryTimestampUtc = openTime ?? closeTime.toISOString();
  const sessionCode = resolveSessionAt(entryTimestampUtc)?.code ?? null;

  return {
    positionId,
    closeDealTicket: ticket,
    symbol: deal.symbol || 'XAUUSD',
    direction: isBuy ? 'BUY' : 'SELL',
    type: isBuy ? 'buy' : 'sell',
    lots: volume,
    closePrice: price,
    openPrice,
    closeTime: closeTime.toISOString(),
    openTime,
    date: closeTime.toISOString().split('T')[0],
    pnl: profit,
    commission,
    swap,
    netPnl,
    pips,
    status: 'closed',
    source: 'BROKER_METAAPI',
    brokerType: ctx.brokerType,
    brokerServer: ctx.server,
    market: isGoldSymbol(deal.symbol || 'XAUUSD') ? 'GOLD' : 'OTHER',
    outcome: outcomeForPnl(netPnl),
    entryTimestampUtc,
    sessionCode,
    sessionSource: 'broker',
    sessionEngineVersion: SESSION_ENGINE_VERSION,
  };
}

const combineEntryDeals = (previous, next) => {
  if (!previous || isBuyDeal(previous) !== isBuyDeal(next)) return next;
  const previousVolume = finiteNumber(previous.volume);
  const nextVolume = finiteNumber(next.volume);
  const totalVolume = previousVolume + nextVolume;
  if (totalVolume <= 0) return next;
  return {
    ...next,
    price: ((finiteNumber(previous.price) * previousVolume) + (finiteNumber(next.price) * nextVolume)) / totalVolume,
    volume: totalVolume,
    commission: finiteNumber(previous.commission) + finiteNumber(next.commission),
    time: previous.time || next.time,
  };
};

export function normalizeMetaApiDeals(deals, ctx) {
  const entries = new Map();
  const seen = new Set();
  const normalized = [];
  const sortedDeals = [...(Array.isArray(deals) ? deals : [])]
    .sort((a, b) => validDate(a.time, new Date(0)) - validDate(b.time, new Date(0)));

  for (const deal of sortedDeals) {
    const ticket = deal.id ?? deal.ticket ?? deal.dealId;
    if (ticket != null && seen.has(String(ticket))) continue;
    if (ticket != null) seen.add(String(ticket));
    if (!isTradeDeal(deal)) continue;
    const entryType = String(deal.entryType || '').toUpperCase();
    const positionKey = String(deal.positionId ?? deal.position ?? deal.id ?? deal.ticket ?? '');
    const previousEntry = entries.get(positionKey) || null;

    if (entryType === 'DEAL_ENTRY_IN') {
      entries.set(positionKey, combineEntryDeals(previousEntry, deal));
      continue;
    }

    if (entryType === 'DEAL_ENTRY_INOUT' && previousEntry) {
      const volume = finiteNumber(deal.volume);
      const closedVolume = Math.min(volume, finiteNumber(previousEntry.volume));
      const closeFraction = volume > 0 ? closedVolume / volume : 0;
      normalized.push(normalizeDeal({ ...deal, volume: closedVolume,
        commission: finiteNumber(deal.commission) * closeFraction }, ctx, previousEntry));
      const openedVolume = volume - closedVolume;
      if (openedVolume > 0.0000001) entries.set(positionKey, { ...deal, volume: openedVolume,
        commission: finiteNumber(deal.commission) * (1 - closeFraction) });
      else entries.delete(positionKey);
      continue;
    }

    if (!entryType || ['DEAL_ENTRY_OUT', 'DEAL_ENTRY_OUT_BY', 'DEAL_ENTRY_INOUT'].includes(entryType)) {
      normalized.push(normalizeDeal(deal, ctx, previousEntry));
    } else {
      continue;
    }

    if (entryType === 'DEAL_ENTRY_INOUT') {
      entries.set(positionKey, deal);
    } else if (previousEntry) {
      const remainingVolume = finiteNumber(previousEntry.volume) - finiteNumber(deal.volume);
      if (remainingVolume > 0.0000001) entries.set(positionKey, { ...previousEntry, volume: remainingVolume,
        commission: finiteNumber(previousEntry.commission) * remainingVolume / finiteNumber(previousEntry.volume) });
      else entries.delete(positionKey);
    }
  }

  return normalized;
}

/**
 * Create a short-lived MetaApi account used only for the current request.
 *
 * Never reuse an existing provider account here: doing so would turn a transient
 * credential exchange into persistent provider-side access.
 */
export async function provisionMetaApiAccount({ login, password, server, brokerType }, options = {}) {
  const api = getApi();
  const platform = brokerType === 'mt4' ? 'mt4' : 'mt5';
  const loginStr = String(login);

  const account = await api.metatraderAccountApi.createAccount({
    name: 'xaujournal-transient-' + Date.now(),
    type: 'cloud-g2',
    login: loginStr,
    password,
    server,
    platform,
    magic: 0,
    application: 'MetaApi',
    reliability: 'high',
    tags: ['xaujournal-transient'],
  });
  // Ownership transfers immediately, BEFORE tracking/deploy/wait can throw.
  options.onAccount?.(account);
  await options.onCreated?.(account.id);
  return account;
}

/**
 * Fetch closed deals since optional fromDate.
 */
export async function fetchMetaApiDeals(accountOrId, fromDate = null, deadline = Date.now() + SYNC_BUDGET_MS) {
  const account = typeof accountOrId === 'string'
    ? await getApi().metatraderAccountApi.getAccount(accountOrId) : accountOrId;
  const connection = account.getRPCConnection();
  try {
    await connection.connect();
    await connection.waitSynchronized(remainingSeconds(deadline));

    const start = fromDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = new Date();
    const rawDeals = [];
    for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
      remainingSeconds(deadline);
      const result = await connection.getDealsByTimeRange(start, end, page * HISTORY_PAGE_SIZE, HISTORY_PAGE_SIZE);
      if (result?.synchronizing) {
        throw new BrokerSyncError('broker-history-incomplete', 'Broker history is still synchronizing. Please retry.');
      }
      const deals = Array.isArray(result) ? result : result?.deals;
      if (!Array.isArray(deals)) throw new BrokerSyncError('broker-history-incomplete', 'Broker returned incomplete history. Please retry.');
      rawDeals.push(...deals);
      if (deals.length < HISTORY_PAGE_SIZE) break;
      if (page === MAX_HISTORY_PAGES - 1) throw new BrokerSyncError('broker-history-limit', 'Broker history is too large for one import. Please contact support.');
    }

    // The rolling history window may omit an entry for a still-open position.
    // Fetch full lifecycles for the positions being normalized, so fees and
    // reversals are calculated consistently on subsequent imports.
    const positions = new Set(rawDeals.filter(isTradeDeal).map(d => d.positionId ?? d.position).filter(Boolean));
    for (const positionId of positions) {
      const positionDeals = rawDeals.filter(d => String(d.positionId ?? d.position) === String(positionId));
      const earliest = positionDeals.reduce((a, b) => validDate(a.time) < validDate(b.time) ? a : b);
      if (String(earliest.entryType || '').toUpperCase() === 'DEAL_ENTRY_IN') continue;
      // MT4 history can lack entryType and is already a closed-trade record.
      if (!earliest.entryType) continue;
      remainingSeconds(deadline);
      const result = await connection.getDealsByPosition(String(positionId));
      if (result?.synchronizing || !Array.isArray(result?.deals)) {
        throw new BrokerSyncError('broker-history-incomplete', 'Broker position history is incomplete. Please retry.');
      }
      rawDeals.push(...result.deals);
    }

    const ctx = {
      brokerType: account.platform,
      server: account.server,
    };

    remainingSeconds(deadline);
    return normalizeMetaApiDeals(rawDeals, ctx).filter(trade => new Date(trade.closeTime) >= start && new Date(trade.closeTime) < end);
  } finally {
    try {
      await connection.close();
    } catch {
      // The sync result is still usable if provider-side cleanup fails.
    }
  }
}

export async function fetchBrokerTrades(credentials, fromDate = null, options = {}) {
  const deadline = Date.now() + SYNC_BUDGET_MS;
  let account;
  let primaryError;
  let cleanupError;
  let result;
  try {
    await provisionMetaApiAccount(credentials, { ...options, onAccount: value => { account = value; } });
    remainingSeconds(deadline);
    await account.deploy();
    await account.waitConnected(remainingSeconds(deadline));
    result = await fetchMetaApiDeals(account, fromDate, deadline);
  } catch (error) {
    primaryError = error;
  } finally {
    if (account) {
      try {
        await deleteMetaApiAccount(account);
        await options.onRemoved?.(account.id);
      } catch {
        // The durable cleanup record survives; never mask the original error.
        console.error('[metaapi-cleanup] Temporary account cleanup requires retry');
        cleanupError = new BrokerSyncError('broker-cleanup', 'Broker cleanup is pending. Please retry later.');
      }
    }
  }
  if (primaryError) throw primaryError;
  if (cleanupError) throw cleanupError;
  return result;
}

export async function deleteMetaApiAccount(accountOrId) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const account = typeof accountOrId === 'string'
        ? await getApi().metatraderAccountApi.getAccount(accountOrId) : accountOrId;
      if (typeof account.remove === 'function') await account.remove();
      else if (typeof getApi().metatraderAccountApi.removeAccount === 'function') {
        // Compatibility for test doubles and older SDK wrappers; the current
        // SDK path above is account.remove().
        await getApi().metatraderAccountApi.removeAccount(account.id);
      } else throw new Error('MetaApi account removal is unavailable');
      return;
    } catch (err) {
      if (err?.name === 'NotFoundError' || err?.status === 404) return;
      lastError = err;
    }
  }
  console.error('[metaapi-cleanup] Temporary provider account removal failed');
  throw lastError || new Error('Temporary provider account removal failed');
}

