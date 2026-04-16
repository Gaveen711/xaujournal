// src/components/MT5SyncSetup.jsx
// XAU Journal — MT5 & TradingView Auto-Sync Settings UI
// Calls Vercel API routes (not Firebase callable functions).
// Auth: sends Firebase ID token as Authorization: Bearer header.

import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { auth } from "../firebase";
import {
  Key,
  Clipboard,
  ClipboardCheck,
  Download,
  TrashFill,
  Lightning,
  InfoCircle,
  ChevronRight,
  LockFill,
  ExclamationTriangleFill,
} from "react-bootstrap-icons";

// ── Vercel endpoint URLs ──────────────────────────────────────────────────────
const BASE_URL     = window.location.origin;
const MT5_ENDPOINT = `${BASE_URL}/api/sync-trade`;
const TV_ENDPOINT  = `${BASE_URL}/api/tv-webhook`;
// ─────────────────────────────────────────────────────────────────────────────

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

async function callApi(path) {
  const token = await getIdToken();
  const res   = await fetch(path, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MT5SyncSetup() {
  const { plan = 'free', expiry = null, setShowPricingModal: onUpgrade } = useOutletContext();
  const [apiKey,   setApiKey]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied,   setCopied]   = useState("");
  const [tab,      setTab]      = useState("mt5");
  const [error,    setError]    = useState(null);

  // ── Plan status helpers ─────────────────────────────────────────────────
  const nowMs        = Date.now();
  const isActivePro  = plan === 'pro' || (plan === 'pro' && expiry && new Date(expiry).getTime() > nowMs);
  const isGrace      = plan === 'grace';
  const isSyncAllowed = isActivePro || isGrace;

  const graceEndsIn = 0; // Simplified for now


  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const data = await callApi("/api/generate-api-key");
      setApiKey(data.apiKey);
    } catch (e) {
      setError(e.message || "Could not generate key. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!window.confirm("Revoke your key? MT5 and TradingView will stop syncing until you generate a new one."))
      return;
    setRevoking(true);
    try {
      await callApi("/api/revoke-api-key");
      setApiKey(null);
    } catch (e) {
      setError(e.message || "Could not revoke key.");
    } finally {
      setRevoking(false);
    }
  }

  function copy(text, label) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  const CopyBtn = ({ text, label, className = "" }) => (
    <button
      onClick={() => copy(text, label)}
      className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 active:scale-95 ${
        copied === label
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
      } ${className}`}
    >
      {copied === label ? <ClipboardCheck className="w-3 h-3" /> : <Clipboard className="w-3 h-3" />}
      {copied === label ? "Copied" : "Copy"}
    </button>
  );

  // TV alert message — key is injected live
  const tvTemplate = JSON.stringify(
    {
      apiKey:     apiKey || "YOUR_XAU_API_KEY",
      event:      "open",
      source:     "tradingview",
      positionId: "XAUUSD-{{timenow}}",
      symbol:     "{{ticker}}",
      direction:  "buy",
      lots:       0.1,
      price:      "{{close}}",
      profit:     0,
      time:       "{{timenow}}",
    },
    null,
    2
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-gradient">AUTO-SYNC TERMINAL</h1>
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Connect your algorithmic and manual execution sources.</p>
      </header>

      <div className="space-y-6 max-w-2xl">

      {/* ── Free-user gate ──────────────────────────────────────────────── */}
      {!isSyncAllowed && (
        <div className="rounded-2xl border border-border/40 bg-card p-8 flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-muted border border-border/40 flex items-center justify-center">
            <LockFill className="w-5 h-5 text-foreground/30" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground/80">Pro Feature</h3>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed max-w-xs">
              MT5 & TradingView Auto-Sync is available on the Pro plan.
              Upgrade to connect your terminal and sync trades automatically.
            </p>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="btn-primary flex items-center gap-2 text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl"
            >
              <Lightning className="w-3.5 h-3.5" />
              Upgrade to Pro
            </button>
          )}
        </div>
      )}

      {/* ── Grace period warning ────────────────────────────────────────── */}
      {isGrace && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <ExclamationTriangleFill className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-amber-500">
              Grace Period — {graceEndsIn} day{graceEndsIn !== 1 ? 's' : ''} remaining
            </p>
            <p className="text-[10px] text-amber-500/70 mt-0.5 leading-relaxed">
              Your Pro subscription has lapsed. Your API key still works for {graceEndsIn} more day{graceEndsIn !== 1 ? 's' : ''}.
              After that, your key will be revoked and syncing will stop.
            </p>
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="mt-2 text-[10px] font-black uppercase tracking-widest text-amber-500 underline underline-offset-2 hover:text-amber-400 transition-colors"
              >
                Renew Pro →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Rest of UI only shown when sync is allowed ──────────────────── */}
      {isSyncAllowed && (<>
      <div className="flex items-start gap-4 p-5 rounded-2xl border border-primary/20 bg-primary/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
          <Lightning className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
            MT5 &amp; TradingView Auto-Sync
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Trades close on MT5 or trigger an alert on TradingView → they appear
            in your journal automatically. No manual entry required.
          </p>
        </div>
      </div>

      {/* ── Step 1: API Key ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0">1</span>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground/80">
            Get Your API Key
          </h3>
        </div>

        {!apiKey ? (
          <div className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-medium">
                <InfoCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}
            <button
              id="generate-api-key-btn"
              className="btn-primary flex items-center gap-2 text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl"
              onClick={handleGenerate}
              disabled={loading}
            >
              <Key className={`w-3.5 h-3.5 ${loading ? "animate-pulse" : ""}`} />
              {loading ? "Generating…" : "Generate API Key"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Key display */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/40">
              <Key className="w-3.5 h-3.5 text-primary shrink-0" />
              <code className="text-[11px] font-mono text-foreground/90 flex-1 truncate">
                {apiKey}
              </code>
              <CopyBtn text={apiKey} label="key" />
            </div>
            <p className="text-[10px] text-amber-500/80 flex items-center gap-1.5">
              <InfoCircle className="w-3 h-3 shrink-0" />
              Keep this private — it links your MT5/TradingView directly to your account.
            </p>
            <button
              id="revoke-api-key-btn"
              onClick={handleRevoke}
              disabled={revoking}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-destructive hover:text-destructive/80 hover:bg-destructive/10 px-3 py-2 rounded-lg transition-all duration-200 active:scale-95 border border-destructive/20 hover:border-destructive/40"
            >
              <TrashFill className="w-3 h-3" />
              {revoking ? "Revoking…" : "Revoke key"}
            </button>
          </div>
        )}
      </div>

      {/* ── Steps 2-N: only shown after key is generated ─────────────── */}
      {apiKey && (
        <>
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border/30">
            {["mt5", "tv"].map((t) => (
              <button
                key={t}
                id={`sync-tab-${t}`}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  tab === t
                    ? "bg-background shadow border border-border/40 text-primary"
                    : "text-foreground/40 hover:text-foreground/70"
                }`}
              >
                {t === "mt5" ? "MT5 Expert Advisor" : "TradingView Alerts"}
              </button>
            ))}
          </div>

          {/* ── MT5 Instructions ─────────────────────────────────────── */}
          {tab === "mt5" && (
            <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground/80">
                  Install the Expert Advisor
                </h3>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Trades sync the moment they open or close in MT5 — even if you trade from your phone, just leave MT5 running on desktop.
              </p>

              <ol className="space-y-4">
                {[
                  {
                    n: 1,
                    content: (
                      <>
                        <strong className="text-foreground">Download the EA file</strong>
                        <div className="mt-2">
                          <a
                            href="/mt5/XAUJournalEA.mq5"
                            download="XAUJournalEA.mq5"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all duration-200 active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5" />
                            XAUJournalEA.mq5
                          </a>
                        </div>
                      </>
                    ),
                  },
                  {
                    n: 2,
                    content: (
                      <>
                        In MT5: <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 text-[10px] font-mono">File → Open Data Folder</kbd> →
                        open <code className="text-primary text-[10px]">MQL5/Experts/</code> → paste the EA file there
                      </>
                    ),
                  },
                  {
                    n: 3,
                    content: (
                      <>
                        Open MetaEditor <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 text-[10px] font-mono">F4</kbd> →
                        find <code className="text-primary text-[10px]">XAUJournalEA.mq5</code> →
                        press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 text-[10px] font-mono">F7</kbd> to compile
                      </>
                    ),
                  },
                  {
                    n: 4,
                    content: (
                      <>
                        Drag the EA onto any <strong className="text-foreground">XAUUSD chart</strong> in MT5
                      </>
                    ),
                  },
                  {
                    n: 5,
                    content: (
                      <>
                        <strong className="text-foreground">In the EA inputs dialog, set:</strong>
                        <div className="mt-3 space-y-2">
                          {/* API Key row */}
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/40">
                            <span className="text-[10px] text-foreground/50 shrink-0 w-20">API Key</span>
                            <code className="text-[10px] font-mono text-foreground/90 flex-1 truncate">{apiKey}</code>
                            <CopyBtn text={apiKey} label="ea-key" />
                          </div>
                          {/* Endpoint URL row */}
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/40">
                            <span className="text-[10px] text-foreground/50 shrink-0 w-20">Endpoint URL</span>
                            <code className="text-[10px] font-mono text-foreground/90 flex-1 truncate">{MT5_ENDPOINT}</code>
                            <CopyBtn text={MT5_ENDPOINT} label="ea-url" />
                          </div>
                        </div>
                      </>
                    ),
                  },
                  {
                    n: 6,
                    content: (
                      <>
                        Go to <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 text-[10px] font-mono">Tools → Options → Expert Advisors</kbd> →
                        tick <strong className="text-foreground">"Allow WebRequest for listed URL"</strong> →
                        add <code className="text-primary text-[10px] break-all">{MT5_ENDPOINT}</code> → OK
                      </>
                    ),
                  },
                  {
                    n: 7,
                    content: (
                      <>
                        <strong className="text-green-400">Test it:</strong> open and close a small trade on XAUUSD — it should appear in your journal within seconds.
                      </>
                    ),
                  },
                ].map(({ n, content }) => (
                  <li key={n} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-muted border border-border/40 text-[9px] font-black text-foreground/50 flex items-center justify-center shrink-0 mt-0.5">
                      {n}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-relaxed">{content}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ── TradingView Instructions ──────────────────────────────── */}
          {tab === "tv" && (
            <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground/80">
                  Configure TradingView Alert
                </h3>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-500/80 leading-relaxed">
                <InfoCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  TradingView alerts can't report broker P&amp;L — profit will be 0.
                  P&amp;L will be filled automatically if you also run the MT5 EA, or you can edit it manually.
                </span>
              </div>

              <ol className="space-y-4">
                {[
                  {
                    n: 1,
                    content: (
                      <>
                        Open TradingView → open a <strong className="text-foreground">XAUUSD chart</strong> →
                        click the Alert bell icon or press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 text-[10px] font-mono">Alt+A</kbd>
                      </>
                    ),
                  },
                  {
                    n: 2,
                    content: <>Set your alert condition (e.g. "Price crosses above 3220")</>,
                  },
                  {
                    n: 3,
                    content: (
                      <>
                        In the <strong className="text-foreground">Notifications</strong> tab:
                        enable <strong className="text-foreground">Webhook URL</strong> → paste:
                        <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/40">
                          <code className="text-[10px] font-mono text-foreground/90 flex-1 truncate">{TV_ENDPOINT}</code>
                          <CopyBtn text={TV_ENDPOINT} label="tv-url" />
                        </div>
                      </>
                    ),
                  },
                  {
                    n: 4,
                    content: (
                      <>
                        <strong className="text-foreground">Paste this JSON in the Message field</strong>{" "}
                        <span className="text-foreground/40">(your key is already filled in)</span>
                        <div className="mt-2 relative rounded-xl border border-border/40 bg-muted/30 overflow-hidden">
                          <pre className="p-3 text-[10px] font-mono text-foreground/80 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                            {tvTemplate}
                          </pre>
                          <div className="absolute top-2 right-2">
                            <CopyBtn text={tvTemplate} label="tv-msg" />
                          </div>
                        </div>
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          Change <code className="text-primary">event</code> to <code className="text-primary">"open"</code> for entry and{" "}
                          <code className="text-primary">"close"</code> for exit. Change{" "}
                          <code className="text-primary">direction</code> to <code className="text-primary">"buy"</code> or <code className="text-primary">"sell"</code>.
                        </p>
                      </>
                    ),
                  },
                  {
                    n: 5,
                    content: (
                      <>
                        Click <strong className="text-green-400">Create</strong>. When the alert fires, the trade appears in your journal.
                      </>
                    ),
                  },
                ].map(({ n, content }) => (
                  <li key={n} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-muted border border-border/40 text-[9px] font-black text-foreground/50 flex items-center justify-center shrink-0 mt-0.5">
                      {n}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-relaxed">{content}</span>
                  </li>
                ))}
              </ol>

              {/* Pro tip */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-[10px] text-primary/80 leading-relaxed">
                <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Pro tip:</strong> Create two alerts — one for entry (<code>event: "open"</code>) and one for exit (<code>event: "close"</code>) to get a complete trade record with direction and timing.
                </span>
              </div>
            </div>
          )}
        </>
      )}
      </>)}
      </div>
    </div>

  );
}
