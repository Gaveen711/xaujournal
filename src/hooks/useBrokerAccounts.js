// Broker credentials are kept client-side and sent only for transient sync
// requests. Storage lives in ../lib/brokerCredentials.js, which splits durable
// non-secret metadata (localStorage) from the password (sessionStorage, tab
// lifetime only) — see that module for why.
import { useEffect, useRef, useState } from 'react';
import { useAppServices } from '../app/di/AppServicesContext.jsx';
import {
  readLocalAccounts,
  readSessionPassword,
  secretKey,
  writeLocalAccounts,
  writeSessionPassword,
} from '../lib/brokerCredentials.js';
// Shared ladder also covers the serialized {seconds} timestamp shape, which
// the local coercion here used to miss (lastSyncTime rendered as null after
// a JSON round-trip through the local cache).
import { toIsoString } from '../lib/tradeUtils';

/**
 * True once the server-owned doc carries the broker login (spec §2.1). An empty
 * string is treated as absent, matching the route's own adoption guard.
 */
const hasServerLogin = (account) => typeof account?.login === 'string' && account.login !== '';

/** Removes one account's durable metadata from this device (spec §6 drain). */
function dropLocalAccount(uid, accountId) {
  writeLocalAccounts(uid, readLocalAccounts(uid).filter((item) => item.id !== accountId));
}

/** Coordinates authenticated broker metadata and secure server-side sync commands. */
export function useBrokerAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { auth, brokerRepository: repository } = useAppServices();
  // Accounts this mount has already sent an `adopt` for, keyed `uid:accountId`.
  // A ref, not state: the guard must be read and written synchronously between
  // two listener events in the same tick, which a re-render cannot promise.
  const adoptedRef = useRef(new Set());
  const syncingRef = useRef(new Set());
  // Successful disconnects stay hidden while the server snapshot catches up.
  const removedRef = useRef(new Set());

  useEffect(() => {
    let unsubscribeUser = null;
    let unsubscribeAccounts = null;
    // Marks the previous signed-in session's in-flight adoption stale so it
    // cannot publish into a list that now belongs to a different user.
    let disposeSession = null;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      unsubscribeUser?.();
      unsubscribeAccounts?.();
      disposeSession?.();
      unsubscribeUser = null;
      unsubscribeAccounts = null;
      disposeSession = null;
      if (!user) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      let userData = {};
      let serverAccounts = [];
      const session = { active: true };
      disposeSession = () => { session.active = false; };
      setLoading(true);
      setError(null);
      const publishAccounts = () => {
        try {
          const localList = readLocalAccounts(user.uid);
          const localById = new Map(localList.map((account) => [account.id, account]));
          const managed = serverAccounts.map((account) => {
            const local = localById.get(account.id) || {};
            return {
              ...local,
              ...account,
              // Server-wins on the one field that decides whether sync works at
              // all (spec §3.6). The spread alone was not enough: a doc
              // written before `login` was persisted carries no key, and one
              // carrying an empty value would blank out a still-usable local
              // copy mid-migration. Only a real server login displaces this
              // device's.
              login: hasServerLogin(account) ? account.login : (local.login || null),
              platform: account.brokerType || account.platform,
              managedByWorker: true,
              requiresReconnect: false,
              lastSyncTime: toIsoString(account.lastSyncTime),
              lastSyncStatus: account.lastSyncStatus || account.syncJobState || 'queued',
              lastSyncError: account.lastSyncError || null,
              tradeCount: Number(account.tradeCount || 0),
              isActive: account.isActive !== false,
            };
          });
          const legacy = localList.filter((account) => account.managedByWorker !== true).map((account) => ({
            ...account,
            managedByWorker: false,
            requiresReconnect: true,
            lastSyncTime: toIsoString(userData.lastBrokerSync),
            lastSyncStatus: userData.lastBrokerSyncStatus || 'unknown',
            lastSyncError: userData.lastBrokerSyncError || null,
            tradeCount: Number(userData.lastBrokerSyncCount || 0),
            isActive: true,
          }));
          setAccounts([...managed, ...legacy].filter(
            (account) => !removedRef.current.has(`${user.uid}:${account.id}`),
          ));
        } catch (parseError) {
          console.error('Failed to parse local broker accounts:', parseError);
          setAccounts(serverAccounts
            .filter((account) => !removedRef.current.has(`${user.uid}:${account.id}`))
            .map((account) => ({
              ...account,
              platform: account.brokerType || account.platform,
              managedByWorker: true,
              requiresReconnect: false,
              lastSyncTime: toIsoString(account.lastSyncTime),
              isActive: account.isActive !== false,
            })));
        }
      };

      /**
       * One-shot localStorage → Firestore migration of the broker login (spec
       * §6 backfill matrix; §D-2). Until the login lives on the server doc,
       * clearing this browser's storage or opening the app on a second device
       * silently kills sync — `syncAccount` refuses without a login — while the
       * UI keeps presenting the account as connected.
       *
       * Fire-and-forget, at most one POST per account per mount: the guard is
       * recorded BEFORE the request, so a second snapshot arriving mid-flight
       * cannot double-fire, and a failure is never retried in this session (the
       * next mount tries again). Legacy records are deliberately excluded —
       * they keep rendering as `requiresReconnect` this release.
       */
      const runAdoption = async (currentAccounts) => {
        if (typeof repository.adoptBrokerAccount !== 'function') return;
        const localById = new Map(readLocalAccounts(user.uid).map((item) => [item.id, item]));
        if (localById.size === 0) return;
        const adopted = new Map();
        let drained = false;
        for (const account of currentAccounts) {
          const local = localById.get(account.id);
          if (!local || local.managedByWorker !== true) continue;
          if (hasServerLogin(account)) {
            // The listener already shows server truth, so this device's copy is
            // redundant metadata — drop it whether or not we adopted it.
            dropLocalAccount(user.uid, account.id);
            drained = true;
            continue;
          }
          const login = typeof local.login === 'string' ? local.login.trim() : '';
          const guardKey = `${user.uid}:${account.id}`;
          if (!login || adoptedRef.current.has(guardKey)) continue;
          adoptedRef.current.add(guardKey);
          try {
            await repository.adoptBrokerAccount(account.id, login);
            adopted.set(account.id, login);
            dropLocalAccount(user.uid, account.id);
            drained = true;
          } catch (adoptError) {
            if (adoptError?.code === 'login-mismatch') {
              // 409: the doc already carries a different login. Server truth is
              // never overwritten — the stale local copy is what goes.
              dropLocalAccount(user.uid, account.id);
              drained = true;
            } else {
              // Offline or a transient 5xx: keep the local copy so sync still
              // works on this device, and leave the retry to the next mount.
              console.warn('Broker login adoption deferred:', adoptError?.message || adoptError);
            }
          }
        }
        if (!drained) return;
        if (adopted.size) {
          // The write landed, so this value *is* server truth now. Folding it
          // in beats waiting for the snapshot round trip: between dropping the
          // local copy and the listener echoing the doc back, the account would
          // otherwise render with no login at all — which is exactly the state
          // `syncAccount` refuses to run in.
          serverAccounts = serverAccounts.map((account) => (
            adopted.has(account.id) ? { ...account, login: adopted.get(account.id) } : account
          ));
        }
        if (session.active) publishAccounts();
      };

      unsubscribeUser = repository.subscribeToUserDoc(user.uid, (docSnap) => {
        userData = docSnap.exists() ? docSnap.data() : {};
        publishAccounts();
      }, (snapshotError) => console.error('Failed to listen to legacy broker stats:', snapshotError));
      unsubscribeAccounts = repository.subscribeToAccounts(user.uid, (nextAccounts) => {
        serverAccounts = nextAccounts;
        publishAccounts();
        setLoading(false);
        runAdoption(nextAccounts).catch((adoptError) => {
          console.error('Broker login adoption failed:', adoptError);
        });
      }, (snapshotError) => {
        setError(snapshotError.message);
        console.error('Failed to listen to broker accounts:', snapshotError);
        publishAccounts();
        setLoading(false);
      });
    });
    return () => {
      unsubscribeAuth();
      unsubscribeUser?.();
      unsubscribeAccounts?.();
      disposeSession?.();
    };
  }, [auth, repository]);

  async function addAccount(login, password, server, brokerType, accountName) {
    setError(null);
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    try {
      const result = await repository.connectBroker({ accountId: login, password, server, platform: brokerType });
      // Metadata is durable; the password is held only for this tab's session.
      // A reconnect of a previously disconnected account must be visible again.
      removedRef.current.delete(`${user.uid}:${result.accountId}`);
      const newAccount = { id: result.accountId, accountName, platform: brokerType, server, login, managedByWorker: true };
      writeLocalAccounts(user.uid, [newAccount]);
      writeSessionPassword(user.uid, result.accountId, password);
      setAccounts([{
        ...newAccount,
        requiresReconnect: false,
        isActive: true,
        lastSyncTime: new Date().toISOString(),
        lastSyncStatus: 'success',
        tradeCount: result.tradeCount || 0,
      }]);
      return result;
    } catch (operationError) {
      setError(operationError.message);
      throw operationError;
    }
  }

  /**
   * `password` is optional: when omitted the credential held for this session
   * is used. A new browser session has none, so the caller is told to
   * reconnect rather than the request being sent without one.
   */
  async function syncAccount(accountId, password) {
    setError(null);
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const syncKey = `${user.uid}:${accountId}`;
    if (syncingRef.current.has(syncKey)) {
      throw Object.assign(new Error('A broker operation is already running.'), { code: 'broker-busy' });
    }
    syncingRef.current.add(syncKey);
    try {
      const account = accounts.find((item) => item.id === accountId);
      if (!account) throw new Error('Broker account not found.');
      if (account.managedByWorker !== true) throw new Error('Reconnect this broker account once to enable secure client-managed sync.');

      const secret = password || readSessionPassword(user.uid, accountId);
      if (!account.login || !account.server || !account.platform) {
        throw new Error('Reconnect this broker account on this device to sync securely.');
      }
      if (!secret) {
        throw Object.assign(new Error('Enter your broker password to sync. Credentials are held for this browser session only.'), { code: 'broker-password-required' });
      }

      const result = await repository.syncBrokerTrades({
        accountId: account.id,
        login: account.login,
        password: secret,
        server: account.server,
        brokerType: account.platform,
      });
      if (password) writeSessionPassword(user.uid, accountId, password);
      return result;
    } catch (operationError) {
      if (operationError.code === 'broker-credentials') sessionStorage.removeItem(secretKey(user.uid));
      setError(operationError.message);
      throw operationError;
    } finally {
      syncingRef.current.delete(syncKey);
    }
  }

  /** True when this tab still holds the credential needed for a silent sync. */
  function hasSessionCredential(accountId) {
    const user = auth.currentUser;
    return Boolean(user && readSessionPassword(user.uid, accountId));
  }

  async function removeAccount(accountId) {
    setError(null);
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    try {
      const localList = readLocalAccounts(user.uid);
      const account = accounts.find((item) => item.id === accountId);
      let result;
      if (account?.managedByWorker === true) {
        try {
          result = await repository.disconnectBroker(accountId);
        } catch {
          result = { message: 'Broker removed from this device. Server cleanup will finish when the connection is restored.' };
        }
      } else {
        result = { message: 'Legacy broker account removed locally.' };
      }
      const remainingLocal = localList.filter((item) => item.id !== accountId);
      writeLocalAccounts(user.uid, remainingLocal);
      // The credential goes with the account it belonged to.
      sessionStorage.removeItem(secretKey(user.uid));
      removedRef.current.add(`${user.uid}:${accountId}`);
      setAccounts((current) => current.filter((item) => item.id !== accountId));
      return result;
    } catch (operationError) {
      setError(operationError.message);
      throw operationError;
    }
  }

  return { accounts, loading, error, addAccount, syncAccount, removeAccount, hasSessionCredential };
}
