import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { auth, storage } from '../../firebase';
import { calcPnl, todayStr, formatCurrency, formatSigned, pnlToneClass } from '../../lib/tradeUtils';
import { isPaidPlan } from '../../lib/entitlements.js';
import { outcomeForPnl } from '../../lib/goldContract.js';
import { resolveSessionAt } from '../../lib/sessionEngine.js';
import { evaluateRules } from '../../lib/disciplineRules.js';
import { submitTrade } from '../../services/tradeService';
import { CurrencyConverter } from '../CurrencyConverter';
import { SectionCard } from '../app/SectionCard';
import { SetupCombobox } from '../app/SetupCombobox';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Field, FieldGroup, FieldLabel } from '../ui/field';
import { cn } from '../../lib/utils';

import {
  Angry,
  CloudUpload,
  Frown,
  Laugh,
  LockKeyhole,
  Meh,
  Smile,
  Trash2,
} from 'lucide-react';
import { requireProFeature } from '../../services/featureGate';
import { ImageViewerModal } from '../ImageViewerModal';

// ─── Tab IDs ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'basic', label: 'Log' },
  { id: 'risk', label: 'Risk' },
  { id: 'mood', label: 'Mood' },
  { id: 'advanced', label: 'Advanced' },
];

// ─── Mood options (matching JournalPage icons) ───────────────────────────────
// Labels align with JournalPage moodLabels: Terrible, Bad, Neutral, Good, Excellent.
// Glyphs stay monochrome: color is reserved for P&L.
const MOODS = [
  { label: 'Terrible', Icon: Angry },
  { label: 'Bad', Icon: Frown },
  { label: 'Neutral', Icon: Meh },
  { label: 'Good', Icon: Smile },
  { label: 'Excellent', Icon: Laugh },
];

// ─── Timeframe options ───────────────────────────────────────────────────────
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];

// ─── Setup grade options ─────────────────────────────────────────────────────
const GRADES = ['A+', 'A', 'B', 'C', 'D'];

// ─── Market structure tags ───────────────────────────────────────────────────
const STRUCTURES = ['Trending', 'Ranging', 'Breakout', 'Reversal', 'Consolidation'];

// ─── Confluence factor tags ──────────────────────────────────────────────────
const CONFLUENCE = ['S/R Level', 'Trend Follow', 'SMC', 'ICT', 'EMA Cross', 'News', 'Fib Level', 'Order Block', 'Liquidity'];

// ─── Confidence scale ────────────────────────────────────────────────────────
const CONFIDENCE_SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

// ─── Select option lists ─────────────────────────────────────────────────────
const SESSION_OPTIONS = [
  { value: 'London', label: 'London' },
  { value: 'NewYork', label: 'New York' },
  { value: 'Tokyo', label: 'Tokyo' },
  { value: 'Sydney', label: 'Sydney' },
];

// ─── Session prefill (§4.2 mapping table) ────────────────────────────────────
// The derived `sessionCode` is the truth and the LogTrade use case stores it;
// this select holds the LEGACY single-hub `session` string, which has no value
// for either overlap. The table resolves each overlap to its most recently
// opened hub, and leaves the placeholder for Off — a weekend-gap fill has no
// session the trader would recognise, and guessing one writes a lie.
function legacySessionPrefill(resolved) {
  if (!resolved) return '';
  switch (resolved.code) {
    // Since the four-session split each single code names its own desk, so the
    // only work left is the legacy 'NewYork' spelling and the overlaps.
    case 'Sydney': return 'Sydney';
    case 'Tokyo': return 'Tokyo';
    case 'London': return 'London';
    case 'NY': return 'NewYork';
    case 'SydneyTokyo': return 'Tokyo';
    case 'TokyoLondon': return 'London';
    case 'LondonNY': return 'NewYork';
    default: return '';
  }
}

/** The AUTO chip and the prefill go stale as the desks open and close; a minute is finer than any boundary. */
const SESSION_TICK_MS = 60000;

/**
 * Firestore forbids document ids matching `__.*__`, so this can never collide
 * with a real trade id — which is what makes filtering the draft's own
 * violations out of the whole-window result safe.
 */
const DRAFT_TRADE_ID = '__draft__';

const EMPTY_SETUPS = Object.freeze([]);

export function DashboardRightSidebar({
  plan,
  isTrial,
  isTrialActive,
  trialTimeLeft,
  trades,
  walletBalance,
  setShowPricingModal,
  toast,
  addTrade,
  isLoadingTrades,
  setIsExpanded,
  // Setup catalog + discipline settings, from the same hooks the outlet context
  // is fed from (DashboardLayout owns both). Absent props degrade to an empty
  // picker and no rule checks rather than to a second Firestore listener.
  setups = EMPTY_SETUPS,
  resolveSetup,
  createSetup,
  archiveSetup,
  disciplineRules,
}) {
  const [activeTab, setActiveTab] = useState('basic');

  const isFree = (plan === 'basic' || plan === 'free') && !isTrial;

  // ── TAB 1: BASIC – Order Form State ────────────────────────────────────────
  const [direction, setDirection] = useState('LONG');
  const [entry, setEntry]         = useState('');
  const [exit,  setExit]          = useState('');
  const [lots,  setLots]          = useState('0.10');
  const [sl,    setSl]            = useState('');
  const [tp,    setTp]            = useState('');
  const [note,  setNote]          = useState('');
  const [setupId, setSetupId]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [screenshots, setScreenshots] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeImageUrl, setActiveImageUrl] = useState(null);
  const fileInputRef = useRef(null);

  // ── TAB 2: RISK – State ────────────────────────────────────────────────────
  const [riskPercent,    setRiskPercent]    = useState('1');
  const [maxDailyLoss,   setMaxDailyLoss]   = useState('');
  const [maxDailyActive, setMaxDailyActive] = useState(false);

  // ── TAB 3: MOOD – State ───────────────────────────────────────────────────
  const [preTradeMood,  setPreTradeMood]  = useState('');
  const [confidence,    setConfidence]    = useState(0);   // 1-10
  const [conviction,    setConviction]    = useState('');   // High / Medium / Low
  const [postReflect,   setPostReflect]   = useState('');

  // ── TAB 4: ADVANCED – State ───────────────────────────────────────────────
  const [timeframe,      setTimeframe]      = useState('');
  const [setupGrade,     setSetupGrade]     = useState('');
  const [marketStructure, setMarketStructure] = useState([]);
  const [confluenceFactors, setConfluenceFactors] = useState([]);

  // ── Session — derived tag (the truth) and the legacy select it prefills ────
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), SESSION_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const autoSession = useMemo(() => resolveSessionAt(nowMs), [nowMs]);
  const autoSessionCode = autoSession?.code ?? null;
  const sessionPrefill = useMemo(() => legacySessionPrefill(autoSession), [autoSession]);

  // Once the trader has picked a session the clock stops overwriting it; the
  // flag resets with the form, so the next trade is prefilled again.
  const [sessionEdited, setSessionEdited] = useState(false);
  const [session, setSession] = useState(sessionPrefill);
  useEffect(() => {
    if (!sessionEdited) setSession(sessionPrefill);
  }, [sessionEdited, sessionPrefill]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleNumericChange = (setter) => (e) => {
    const val = e.target.value;
    if (val === '' || /^[0-9]*[.,]?[0-9]*$/.test(val)) setter(val.replace(',', '.'));
  };

  const restoreSetup = useCallback(
    (id) => archiveSetup?.(id, false),
    [archiveSetup],
  );

  // ── PnL preview ────────────────────────────────────────────────────────────
  const pnlData = calcPnl(
    parseFloat(entry) || 0, parseFloat(exit) || 0,
    parseFloat(lots)  || 0, 0,
    parseFloat(sl)    || 0, parseFloat(tp)   || 0,
    direction === 'LONG' ? 'BUY' : 'SELL', 0
  );

  // ── Auto R:R calculation ───────────────────────────────────────────────────
  const autoRR = useMemo(() => {
    const e = parseFloat(entry), s = parseFloat(sl), t = parseFloat(tp);
    if (!e || !s || !t) return null;
    const risk   = Math.abs(e - s);
    const reward = Math.abs(e - t);
    if (risk === 0) return null;
    return (reward / risk).toFixed(2);
  }, [entry, sl, tp]);


  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (!requireProFeature(plan, setShowPricingModal, toast, 'attach analysis screenshots')) return;

    setUploading(true);
    setUploadProgress(0);

    const uploadedUrls = [];
    const userId = auth.currentUser?.uid;
    if (!userId) {
      toast?.('Please sign in to upload images.', 'error');
      setUploading(false);
      return;
    }

    const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');

    try {
      let completedCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uniqueName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
        const storageRef = ref(storage, `users/${userId}/trades/${uniqueName}`);

        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              const totalProgress = ((completedCount + fileProgress / 100) / files.length) * 100;
              setUploadProgress(Math.round(totalProgress));
            },
            (err) => {
              console.error('File upload error in sidebar:', err);
              reject(err);
            },
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              uploadedUrls.push(url);
              completedCount++;
              resolve();
            }
          );
        });
      }

      setScreenshots(prev => [...prev, ...uploadedUrls]);
      toast?.('Images uploaded successfully.', 'success');
    } catch (err) {
      console.error('Upload error in sidebar:', err);
      toast?.('Failed to upload some images. Please try again.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeScreenshot = (indexToRemove) => {
    setScreenshots(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleLogTrade = async () => {
    if (!entry || !exit || !lots) {
      toast('Please fill in Entry, Exit, and Amount.', 'error');
      return;
    }
    setSaving(true);
    const entryVal = parseFloat(entry);
    const exitVal  = parseFloat(exit);
    const lotsVal  = parseFloat(lots);
    const slVal    = parseFloat(sl) || null;
    const tpVal    = parseFloat(tp) || null;

    const mappedDir = direction === 'LONG' ? 'BUY' : 'SELL';
    const tradeRes  = calcPnl(entryVal, exitVal, lotsVal, 0, slVal, tpVal, mappedDir, 0);
    const { pnl, pips, rr } = tradeRes;
    // The one place the WIN/LOSS/BE threshold is defined, shared with the
    // read-side getTradeOutcome so a logged trade and a re-derived one can
    // never land on different verdicts.
    const outcome = outcomeForPnl(pnl);

    // The same instant the use case will resolve the session tag from, captured
    // once here so the draft the rules judge and the doc that gets written can
    // never disagree about when this trade happened.
    const loggedAt = new Date();

    const tradeData = {
      date: todayStr(),
      direction: mappedDir,
      entry: entryVal,
      exit:  exitVal,
      lots:  lotsVal,
      swap: 0,
      sl: slVal,
      tp: tpVal,
      session,
      setupId,
      // Back-compat: `strategy` stays the human-readable name so pre-setupId
      // readers (and the slug fallback in getTradeSetupKey) still resolve.
      strategy: resolveSetup?.(setupId)?.name ?? '',
      rr,
      pips,
      market: 'GOLD',
      pnl: parseFloat(pnl.toFixed(2)),
      outcome,
      note: note.trim(),
      timestamp: loggedAt,
      // ── New extended fields ──────────────────────────────────────────────
      riskPercent:       riskPercent     ? parseFloat(riskPercent)  : null,
      maxDailyLoss:      maxDailyActive  ? parseFloat(maxDailyLoss) || null : null,
      preTradeMood,
      confidence:        confidence || null,
      conviction,
      postReflect:       postReflect.trim(),
      timeframe,
      setupGrade,
      marketStructure,
      confluenceFactors,
      autoRR:            autoRR ? parseFloat(autoRR) : null,
      screenshots,
    };

    // ── Discipline pre-submit (§4.2) ────────────────────────────────────────
    // Advisory only: the verdict is computed before the write and reported
    // after it, and nothing here can stop the trade being logged. A mirror that
    // refuses to log the trade it disapproves of just teaches the trader to log
    // elsewhere.
    //
    // The draft carries the provenance the use case will store, not just the
    // instant: `manual-logtime` is what makes the revenge rule skip it (§3.3),
    // so the toast can never accuse a trade of something its History row will
    // not show a chip for.
    const draft = {
      ...tradeData,
      id: DRAFT_TRADE_ID,
      entryTimestampUtc: loggedAt.toISOString(),
      sessionSource: 'manual-logtime',
    };
    const draftViolations = evaluateRules(
      [...(Array.isArray(trades) ? trades : []), draft],
      disciplineRules,
      { accountBalance: walletBalance },
    ).filter((entry) => entry.tradeId === DRAFT_TRADE_ID);

    try {
      if (addTrade) {
        await submitTrade({ addTrade, tradeData, plan, trades });
        // Reset all tabs
        setEntry(''); setExit(''); setLots('0.10'); setSl(''); setTp('');
        // Clearing the edited flag hands the select back to the clock, which
        // re-prefills it for the next trade.
        setNote(''); setSetupId(null); setSessionEdited(false);
        setRiskPercent('1'); setMaxDailyLoss(''); setMaxDailyActive(false);
        setPreTradeMood(''); setConfidence(0); setConviction(''); setPostReflect('');
        setTimeframe(''); setSetupGrade(''); setMarketStructure([]); setConfluenceFactors([]);
        setScreenshots([]);
        setActiveTab('basic');
        setIsExpanded(false);
        toast(`Trade logged: ${outcome} ${formatCurrency(pnl, true)}`, outcome === 'WIN' ? 'success' : 'error');
        // After the confirmation, and only once the write actually landed — a
        // rule warning about a trade that failed to save is noise.
        if (draftViolations.length) {
          toast(`Rule check: ${draftViolations.map((entry) => entry.message).join(' · ')}`, 'warn');
        }
      } else {
        toast('Error: Trade submission unavailable.', 'error');
      }
    } catch (err) {
      toast(err?.message || 'Failed to record trade.', 'error');
    } finally {
      setSaving(false);
    }
  };


  // ── Tab badge counts (optional fields filled) ──────────────────────────────
  const riskFilled    = [riskPercent !== '1' && riskPercent, maxDailyActive].filter(Boolean).length;
  const moodFilled    = [preTradeMood, confidence > 0, conviction, postReflect].filter(Boolean).length;
  const advancedFilled = [timeframe, setupGrade, marketStructure.length > 0, confluenceFactors.length > 0].filter(Boolean).length;

  const previewPnl = pnlData?.pnl || 0;
  const previewPips = pnlData?.pips || 0;
  const pnlTone = pnlToneClass(previewPnl, { zero: 'text-muted-foreground' });

  return (
    <div className="dashboard-trade-rail flex w-full flex-col gap-4">

      {/* ORDER FORM */}
      <SectionCard
        surface
        className="dashboard-trade-card"
        title="Log trade"
        meta="XAU/USD"
        actions={
          parseFloat(entry) > 0 && parseFloat(exit) > 0 ? (
            <span className={cn('figure text-[11px]', pnlTone)}>{formatSigned(previewPnl)}</span>
          ) : null
        }
        contentClassName="flex flex-col gap-4"
        footer={
          <div className="flex w-full flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Est. P&L</span>
              <span className={cn('figure text-sm font-medium', pnlTone)}>{formatSigned(previewPnl)}</span>
            </div>
            <Button className="w-full" onClick={handleLogTrade} disabled={saving || isLoadingTrades}>
              {saving ? 'Saving trade…' : direction === 'LONG' ? 'Log buy trade' : 'Log sell trade'}
            </Button>
            {(riskFilled === 0 || moodFilled === 0) && (
              <p className="text-center text-xs text-muted-foreground">
                Fill the Risk and Mood tabs for deeper insights.
              </p>
            )}
          </div>
        }
      >
        {/* Direction — intent, not P&L: caret + word, pressed = bg-muted */}
        <ToggleGroup
          spacing={0}
          aria-label="Trade direction"
          className="w-full"
          value={[direction]}
          onValueChange={([next]) => next && setDirection(next)}
        >
          <ToggleGroupItem
            value="LONG"
            size="sm"
            data-selected={direction === 'LONG'}
            className="dashboard-trade-direction dashboard-trade-direction-buy flex-1"
          >
            <span aria-hidden="true">▲</span> Buy
          </ToggleGroupItem>
          <ToggleGroupItem
            value="SHORT"
            size="sm"
            data-selected={direction === 'SHORT'}
            className="dashboard-trade-direction dashboard-trade-direction-sell flex-1"
          >
            <span aria-hidden="true">▼</span> Sell
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Trial / free tier notice */}
        {isTrialActive && (
          <div className="flex flex-col gap-2 rounded-md bg-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">Pro access active</span>
              {trialTimeLeft && (
                <span className="font-mono text-[11px] text-muted-foreground">{trialTimeLeft}</span>
              )}
            </div>
            <Button size="sm" className="w-full" onClick={() => setShowPricingModal(true)}>
              Keep Pro access
            </Button>
          </div>
        )}

        {isFree && (
          <div className="flex flex-col gap-2 rounded-md bg-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">Free manual journal</span>
              <span className="inline-flex h-[18px] items-center rounded-sm border border-border px-1.5 font-mono text-[11px] leading-none text-muted-foreground">
                Unlimited
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Manual trade logging is unlimited. Upgrade only when you want MT4/MT5 sync and advanced analytics.
            </p>
            <Button size="sm" variant="outline" className="w-full" onClick={() => setShowPricingModal(true)}>
              Add broker sync
            </Button>
          </div>
        )}

        {/* Feature tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(next) => setActiveTab(next)}
          className="w-full min-w-0 flex-col"
        >
          <TabsList activateOnFocus variant="line" className="h-auto w-full">
            {TABS.map((tab) => {
              const badge = tab.id === 'risk' ? riskFilled : tab.id === 'mood' ? moodFilled : tab.id === 'advanced' ? advancedFilled : 0;
              const isTabLocked = isFree && (tab.id === 'mood' || tab.id === 'advanced');
              const trigger = (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  disabled={isTabLocked}
                  className="flex-1 text-xs after:bg-primary"
                >
                  {tab.label}
                  {isTabLocked && (
                    <LockKeyhole className="size-2.5 text-muted-foreground" aria-hidden="true" />
                  )}
                  {badge > 0 && !isTabLocked && (
                    <span className="figure text-[11px] text-muted-foreground">{badge}</span>
                  )}
                </TabsTrigger>
              );
              // A disabled Base UI Tab swallows activation, so the locked
              // upsell rides a capture handler on a wrapper span.
              return isTabLocked ? (
                <span
                  key={tab.id}
                  className="flex flex-1"
                  onClickCapture={() => {
                    requireProFeature(plan, setShowPricingModal, toast, tab.id === 'mood' ? 'Trade psychology log' : 'Advanced setup review');
                  }}
                >
                  {trigger}
                </span>
              ) : (
                trigger
              );
            })}
          </TabsList>

          {/* ── TAB 1 — BASIC ────────────────────────────────────────────── */}
          <TabsContent value="basic" className="w-full min-w-0 pt-2">
            <FieldGroup className="dashboard-trade-fields gap-4">

            {/* Amount / Lots */}
            <Field>
              <FieldLabel htmlFor="trade-lots" className="text-xs text-muted-foreground">
                Amount (lots)
              </FieldLabel>
              <div className="relative">
                <Input
                  id="trade-lots"
                  value={lots}
                  onChange={handleNumericChange(setLots)}
                  placeholder="0.10"
                  className="figure pr-12"
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">
                  lots
                </span>
              </div>
            </Field>

            {/* Entry price */}
            <Field>
              <FieldLabel htmlFor="trade-entry" className="text-xs text-muted-foreground">
                Entry price
              </FieldLabel>
              <div className="relative">
                <Input
                  id="trade-entry"
                  value={entry}
                  onChange={handleNumericChange(setEntry)}
                  placeholder="2345.50"
                  className="figure pr-12"
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">
                  USD
                </span>
              </div>
            </Field>

            {/* Exit price */}
            <Field>
              <FieldLabel htmlFor="trade-exit" className="text-xs text-muted-foreground">
                Exit price
              </FieldLabel>
              <div className="relative">
                <Input
                  id="trade-exit"
                  value={exit}
                  onChange={handleNumericChange(setExit)}
                  placeholder="2350.00"
                  className="figure pr-12"
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">
                  USD
                </span>
              </div>
            </Field>

            {/* TP / SL */}
            <div className="dashboard-trade-field-grid grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="trade-tp" className="text-xs text-muted-foreground">
                  Take profit
                </FieldLabel>
                <Input
                  id="trade-tp"
                  value={tp}
                  onChange={handleNumericChange(setTp)}
                  placeholder="Optional"
                  className="figure"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="trade-sl" className="text-xs text-muted-foreground">
                  Stop loss
                </FieldLabel>
                <Input
                  id="trade-sl"
                  value={sl}
                  onChange={handleNumericChange(setSl)}
                  placeholder="Optional"
                  className="figure"
                />
              </Field>
            </div>

            {/* Session / Setup */}
            <div className="dashboard-trade-field-grid grid grid-cols-2 gap-3">
              <Field>
                <div className="flex min-h-[18px] min-w-0 items-center justify-between gap-1">
                  <FieldLabel htmlFor="trade-session" className="truncate text-xs text-muted-foreground">
                    Session
                  </FieldLabel>
                  {/* Read-only: the chip is the tag that gets stored, while the
                      select below it can only hold a single legacy hub. */}
                  {autoSessionCode && (
                    <span
                      title="Derived from your clock — stored with the trade"
                      className="block min-w-0 truncate rounded-sm border border-border px-1.5 font-mono text-[10px] leading-4 text-muted-foreground"
                    >
                      AUTO · {autoSessionCode}
                    </span>
                  )}
                </div>
                <Select
                  items={SESSION_OPTIONS}
                  value={session || null}
                  onValueChange={(next) => { setSessionEdited(true); setSession(next ?? ''); }}
                >
                  <SelectTrigger id="trade-session" className="w-full">
                    <SelectValue placeholder="Session" />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                data-disabled={isFree || undefined}
                onClickCapture={(e) => {
                  if (isFree) {
                    e.stopPropagation();
                    e.preventDefault();
                    requireProFeature(plan, setShowPricingModal, toast, 'strategy tags');
                  }
                }}
              >
                <FieldLabel htmlFor="trade-setup" className="flex items-center gap-1 text-xs text-muted-foreground">
                  Setup
                  {isFree && <LockKeyhole className="size-2.5" aria-hidden="true" />}
                </FieldLabel>
                <SetupCombobox
                  id="trade-setup"
                  value={setupId}
                  onValueChange={setSetupId}
                  setups={setups}
                  onCreateSetup={createSetup}
                  onRestoreSetup={archiveSetup ? restoreSetup : undefined}
                  onError={(message) => toast(message, 'error')}
                  disabled={isFree}
                  className="disabled:pointer-events-none data-disabled:pointer-events-none"
                />
              </Field>
            </div>

            {/* Notes */}
            <Field>
              <FieldLabel htmlFor="trade-note" className="text-xs text-muted-foreground">
                Notes
              </FieldLabel>
              <Textarea
                id="trade-note"
                rows={5}
                className="resize-none text-sm leading-relaxed"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why did you take this trade?"
              />
            </Field>

            {/* Analysis screenshots */}
            <Field>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Analysis screenshots</span>
                {!isPaidPlan(plan) && (
                  <span className="inline-flex h-[18px] items-center rounded-sm border border-border px-1.5 font-mono text-[11px] leading-none text-muted-foreground">
                    Pro
                  </span>
                )}
              </div>

              {isPaidPlan(plan) ? (
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Add analysis screenshots"
                    className="flex w-full flex-col items-center justify-center gap-1 rounded-md border border-border p-4 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CloudUpload className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs font-medium text-foreground">
                      {uploading ? `Uploading ${uploadProgress}%` : 'Click to add screenshots'}
                    </span>
                    <span className="text-xs text-muted-foreground">PNG, JPG, WEBP · max 5MB</span>
                  </button>

                  {uploading && (
                    <div className="h-1 w-full overflow-hidden rounded-sm bg-muted" aria-hidden="true">
                      <div
                        className="h-full bg-primary transition-all duration-100"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}

                  {screenshots && screenshots.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {screenshots.map((url, i) => (
                        <div key={i} className="relative size-12 overflow-hidden rounded-md border border-border bg-muted">
                          <button
                            type="button"
                            onClick={() => setActiveImageUrl(url)}
                            aria-label={`View screenshot ${i + 1}`}
                            className="block h-full w-full"
                          >
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeScreenshot(i)}
                            aria-label={`Remove screenshot ${i + 1}`}
                            className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-sm border border-border bg-background text-foreground hover:bg-muted"
                          >
                            <Trash2 className="size-2.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-md border border-border p-4">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground opacity-60">
                    <LockKeyhole className="size-3" aria-hidden="true" />
                    Screenshot attachments are a Pro feature
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => { requireProFeature(plan, setShowPricingModal, toast, 'attach analysis screenshots'); }}
                  >
                    Unlock with Pro
                  </Button>
                </div>
              )}
            </Field>

            {/* Live pip count */}
            <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Pip count</span>
              <span className={cn('figure text-sm', pnlToneClass(previewPips, { zero: 'text-muted-foreground' }))}>
                {previewPips !== 0
                  ? `${previewPips > 0 ? '+' : '−'}${Math.abs(previewPips).toFixed(1)} pips`
                  : '— pips'}
              </span>
            </div>
            </FieldGroup>
          </TabsContent>

          {/* ── TAB 2 — RISK ─────────────────────────────────────────────── */}
          <TabsContent value="risk" className="w-full min-w-0 flex-col gap-4 pt-2">

            {/* Auto R:R readout */}
            <div className="flex items-center justify-between rounded-md bg-muted p-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">Auto R:R</span>
                <span className={cn('figure text-lg font-medium', autoRR ? 'text-foreground' : 'text-muted-foreground')}>
                  {autoRR ? `1 : ${autoRR}` : '—'}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">Est. pips</span>
                <span className="figure text-lg font-medium text-foreground">{previewPips.toFixed(1)}</span>
              </div>
            </div>
            {!autoRR && (
              <p className="text-center text-xs text-muted-foreground">
                Fill entry, stop loss and take profit in the Log tab to auto-calculate.
              </p>
            )}

            {/* Risk % per trade */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="trade-risk-percent" className="text-xs font-medium text-muted-foreground">
                  Risk % per trade
                </label>
                <span className="figure text-[11px] text-foreground">{riskPercent || 0}%</span>
              </div>
              <input
                type="range" min="0.1" max="10" step="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                aria-label="Risk percent per trade"
                aria-valuetext={`${riskPercent || 0} percent`}
                className="h-4 w-full cursor-pointer"
                style={{ accentColor: 'hsl(var(--primary))' }}
              />
              <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>0.1%</span><span>2%</span><span>5%</span><span>10%</span>
              </div>
              <div className="relative">
                <Input
                  id="trade-risk-percent"
                  value={riskPercent}
                  onChange={handleNumericChange(setRiskPercent)}
                  placeholder="1.0"
                  className="figure pr-8"
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            {/* Max daily loss */}
            <div className="flex flex-col gap-2 rounded-md bg-muted p-3">
              <div className="flex items-center justify-between">
                <label htmlFor="trade-max-daily-toggle" className="text-xs font-medium text-foreground">
                  Max daily loss limit
                </label>
                <Switch
                  id="trade-max-daily-toggle"
                  checked={maxDailyActive}
                  onCheckedChange={(checked) => setMaxDailyActive(checked)}
                />
              </div>
              {maxDailyActive && (
                <div className="relative">
                  <label htmlFor="trade-max-daily-loss" className="sr-only">Max daily loss (USD)</label>
                  <Input
                    id="trade-max-daily-loss"
                    value={maxDailyLoss}
                    onChange={handleNumericChange(setMaxDailyLoss)}
                    placeholder="e.g. 50.00"
                    className="figure bg-background pr-12"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">
                    USD
                  </span>
                </div>
              )}
            </div>

            {/* Risk note */}
            <p className="border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">
              Professional traders risk <strong className="font-medium text-foreground">1–2%</strong> per trade.
              Never exceed 5% to protect your capital.
            </p>
          </TabsContent>

          {/* ── TAB 3 — MOOD ─────────────────────────────────────────────── */}
          <TabsContent value="mood" className="w-full min-w-0 flex-col gap-4 pt-2">

            {/* Pre-trade mood */}
            <div className="flex flex-col gap-1.5">
              <span id="trade-mood-label" className="text-xs font-medium text-muted-foreground">
                Pre-trade mood
              </span>
              <ToggleGroup
                spacing={0}
                aria-labelledby="trade-mood-label"
                className="w-full"
                value={preTradeMood ? [preTradeMood] : []}
                onValueChange={([next]) => setPreTradeMood(next ?? '')}
              >
                {MOODS.map(({ label, Icon }) => (
                  <ToggleGroupItem key={label} value={label} size="sm" className="flex-1" aria-label={label} title={label}>
                    <Icon aria-hidden="true" />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Confidence */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span id="trade-confidence-label" className="text-xs font-medium text-muted-foreground">
                  Confidence
                </span>
                <span className="figure text-[11px] text-muted-foreground">
                  {confidence > 0 ? `${confidence}/10` : '—'}
                </span>
              </div>
              <ToggleGroup
                spacing={0}
                aria-labelledby="trade-confidence-label"
                className="w-full"
                value={confidence > 0 ? [String(confidence)] : []}
                onValueChange={([next]) => setConfidence(next ? Number(next) : 0)}
              >
                {CONFIDENCE_SCALE.map((n) => (
                  <ToggleGroupItem
                    key={n}
                    value={String(n)}
                    size="sm"
                    aria-label={`Confidence ${n}`}
                    className="figure min-w-0 flex-1 text-[11px]"
                  >
                    {n}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span><span>High</span>
              </div>
            </div>

            {/* Conviction */}
            <div className="flex flex-col gap-1.5">
              <span id="trade-conviction-label" className="text-xs font-medium text-muted-foreground">
                Conviction
              </span>
              <ToggleGroup
                spacing={0}
                aria-labelledby="trade-conviction-label"
                className="w-full"
                value={conviction ? [conviction] : []}
                onValueChange={([next]) => setConviction(next ?? '')}
              >
                {['High', 'Medium', 'Low'].map((lvl) => (
                  <ToggleGroupItem key={lvl} value={lvl} size="sm" className="flex-1 text-xs">
                    {lvl}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Post-trade reflection */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="trade-reflection" className="text-xs font-medium text-muted-foreground">
                Post-trade reflection
              </label>
              <Textarea
                id="trade-reflection"
                rows={3}
                className="resize-none text-sm leading-relaxed"
                value={postReflect}
                onChange={(e) => setPostReflect(e.target.value)}
                placeholder="What did you learn? Did you follow your plan?"
              />
            </div>
          </TabsContent>

          {/* ── TAB 4 — ADVANCED ─────────────────────────────────────────── */}
          <TabsContent value="advanced" className="w-full min-w-0 flex-col gap-4 pt-2">

            {/* Timeframe */}
            <div className="flex flex-col gap-1.5">
              <span id="trade-timeframe-label" className="text-xs font-medium text-muted-foreground">
                Timeframe
              </span>
              <ToggleGroup
                variant="outline"
                aria-labelledby="trade-timeframe-label"
                className="grid w-full grid-cols-4"
                value={timeframe ? [timeframe] : []}
                onValueChange={([next]) => setTimeframe(next ?? '')}
              >
                {TIMEFRAMES.map((tf) => (
                  <ToggleGroupItem key={tf} value={tf} size="sm" className="min-w-0 font-mono text-[11px]">
                    {tf}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Setup grade */}
            <div className="flex flex-col gap-1.5">
              <span id="trade-grade-label" className="text-xs font-medium text-muted-foreground">
                Setup quality grade
              </span>
              <ToggleGroup
                variant="outline"
                aria-labelledby="trade-grade-label"
                className="grid w-full grid-cols-5"
                value={setupGrade ? [setupGrade] : []}
                onValueChange={([next]) => setSetupGrade(next ?? '')}
              >
                {GRADES.map((grade) => (
                  <ToggleGroupItem key={grade} value={grade} size="sm" className="min-w-0 font-mono text-[11px]">
                    {grade}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Market structure */}
            <div className="flex flex-col gap-1.5">
              <span id="trade-structure-label" className="text-xs font-medium text-muted-foreground">
                Market structure
              </span>
              <ToggleGroup
                multiple
                variant="outline"
                aria-labelledby="trade-structure-label"
                className="w-full flex-wrap justify-start"
                value={marketStructure}
                onValueChange={(next) => setMarketStructure(next)}
              >
                {STRUCTURES.map((s) => (
                  <ToggleGroupItem key={s} value={s} size="sm" className="text-xs">
                    {s}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Confluence factors */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span id="trade-confluence-label" className="text-xs font-medium text-muted-foreground">
                  Confluence factors
                </span>
                {confluenceFactors.length > 0 && (
                  <span className="figure text-[11px] text-muted-foreground">{confluenceFactors.length} selected</span>
                )}
              </div>
              <ToggleGroup
                multiple
                variant="outline"
                aria-labelledby="trade-confluence-label"
                className="w-full flex-wrap justify-start"
                value={confluenceFactors}
                onValueChange={(next) => setConfluenceFactors(next)}
              >
                {CONFLUENCE.map((c) => (
                  <ToggleGroupItem key={c} value={c} size="sm" className="text-xs">
                    {c}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </TabsContent>
        </Tabs>
      </SectionCard>

      {/* Currency converter */}
      <div className="w-full shrink-0 pb-6">
        <CurrencyConverter />
      </div>

      {/* Lightbox for zooming screenshots */}
      {activeImageUrl && (
        <ImageViewerModal imageUrl={activeImageUrl} onClose={() => setActiveImageUrl(null)} />
      )}
    </div>
  );
}
