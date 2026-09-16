import { useState, useMemo, useCallback } from 'react';
import { Check2Circle, CloudArrowUp, Trash, LockFill } from 'react-bootstrap-icons';
import { AnimatePresence } from 'framer-motion';
import { CustomSelect } from './ui/CustomSelect';
import { DatePicker } from './ui/DatePicker';
import { SetupCombobox } from './app/SetupCombobox';
import { calcPnl, formatCurrency } from '../lib/tradeUtils';
import { cn } from '../lib/utils';
import { outcomeForPnl } from '../lib/goldContract.js';
import { auth, storage } from '../firebase';
import { useToast } from './ToastContext';
import { ImageViewerModal } from './ImageViewerModal';
import { requireProFeature } from '../services/featureGate';
import { isPaidPlan } from '../lib/entitlements.js';
import { AppDialog } from './app/AppDialog';

/**
 * The form's two alignment tokens.
 *
 * Every labelled control in this modal is the same height and every label sits
 * flush with the field beneath it. Before these, one row could hold a 48px date
 * picker, a 48px select and a 32px combobox, and the labels carried an `ml-1`
 * that indented the text 4px past the field border it was labelling.
 */
const FIELD_LABEL = 'block text-[10px] font-black uppercase tracking-widest text-foreground/70';
const FIELD_CONTROL = 'h-11';

export function EditTradeModal({
  trade,
  plan,
  setShowPricingModal,
  onSave,
  onClose,
  // Setup catalog, from the outlet context the host page already reads. Absent
  // props degrade to an empty picker rather than to a second listener.
  setups,
  createSetup,
  archiveSetup,
}) {
  // Broker and webhook documents store the two prices as openPrice/closePrice
  // (api/_metaapi-broker.js normalizeDeal, api/_tradeService.ts) — the same
  // fallback resolveTradeRiskUsd already applies to `entry`. Without it this
  // form loads a synced trade with two empty price inputs, and calcPnl's
  // `!entry` guard then submits pnl 0 / pips 0 / outcome BE over a real trade.
  // Harmless while every synced edit was denied by firestore.rules; not once
  // the rules let the write through. `??` only, so a legitimate stored 0 stays.
  const [formData, setFormData] = useState({
    ...trade,
    entry: trade.entry ?? trade.openPrice ?? '',
    exit: trade.exit ?? trade.closePrice ?? '',
  });
  const [direction, setDirection] = useState(trade.direction);
  const [session, setSession] = useState(trade.session || '');
  const setup = trade.setup || '';
  const [setupId, setSetupId] = useState(trade.setupId || null);
  const [strategies, setStrategies] = useState(trade.strategies || []);
  const [strategyInput, setStrategyInput] = useState('');
  const [date, setDate] = useState(trade.date);

  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeImageUrl, setActiveImageUrl] = useState(null);

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
              console.error('File upload error in modal:', err);
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

      setFormData(prev => ({
        ...prev,
        screenshots: [...(prev.screenshots || []), ...uploadedUrls]
      }));
      toast?.('Images uploaded successfully.', 'success');
    } catch (err) {
      console.error('Upload error in modal:', err);
      toast?.('Failed to upload some images. Please try again.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const restoreSetup = useCallback(
    (id) => archiveSetup?.(id, false),
    [archiveSetup],
  );

  const removeScreenshot = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      screenshots: (prev.screenshots || []).filter((_, i) => i !== indexToRemove)
    }));
  };

  const derivedMetrics = useMemo(() => {
    const res = calcPnl(
      parseFloat(formData.entry) || 0,
      parseFloat(formData.exit) || 0,
      parseFloat(formData.lots) || 0,
      0,
      parseFloat(formData.sl) || null,
      parseFloat(formData.tp) || null,
      direction,
      parseFloat(formData.swap) || 0
    );

    return {
      pnl: res.pnl ?? 0,
      pips: res.pips ?? 0,
      rr: res.rr,
      outcome: outcomeForPnl(res.pnl)
    };
  }, [formData.entry, formData.exit, formData.lots, formData.swap, formData.sl, formData.tp, direction]);

  const handleNumericChange = (field) => (e) => {
    const val = e.target.value;
    if (val === '' || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
      setFormData(prev => ({
        ...prev,
        [field]: val.replace(',', '.')
      }));
    }
  };

  // Two constraints shape this payload, and spreading `...formData` broke both.
  //
  // 1. formData is seeded from `{ ...trade }`, so on a broker-synced trade it
  //    carries server-owned fields (netPnl, positionId, accountId, closeTime,
  //    commission, status). firestore.rules validates trades with a hasOnly()
  //    allowlist that contains none of them, so every edit of a synced trade
  //    was rejected outright. Widening the allowlist is not the fix: netPnl is
  //    what tradePnlValue prefers, so admitting it would hand the client
  //    control of reported P&L while bypassing the absPnlDiff integrity check
  //    (which only constrains `pnl`).
  // 2. handleNumericChange stores raw input text, so entry/exit/lots are
  //    strings once touched, and the rules require `is number`.
  //
  // editTrade issues transaction.update(), which merges — omitted fields keep
  // their stored values, so sending only what this form owns is safe.
  const handleSubmit = (e) => {
    e.preventDefault();

    const num = (value, fallback = 0) => {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    // sl/tp have no input here; they ride through from the loaded trade, where
    // "no level set" is null rather than 0 — a 0 stop would be a real price.
    const optionalNum = (value) => {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    onSave(trade.id, {
      entry: num(formData.entry),
      exit: num(formData.exit),
      lots: num(formData.lots),
      swap: num(formData.swap),
      sl: optionalNum(formData.sl),
      tp: optionalNum(formData.tp),
      note: formData.note ?? '',
      screenshots: Array.isArray(formData.screenshots) ? formData.screenshots : [],
      direction,
      session,
      setup,
      // Explicit null, never undefined: Firestore rejects undefined outright,
      // and clearing the picker has to be able to untag the trade.
      setupId: setupId ?? null,
      strategies: Array.isArray(strategies) ? strategies : [],
      date,
      pnl: derivedMetrics.pnl,
      pips: derivedMetrics.pips,
      // Firestore rejects undefined outright; rr is genuinely absent when no
      // stop is set, and the rules leave it untyped.
      rr: derivedMetrics.rr ?? null,
      outcome: derivedMetrics.outcome
    });
  };

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Modify operation"
      size="lg"
    >
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className={FIELD_LABEL}>Date</label>
              <DatePicker value={date} onChange={setDate} className={FIELD_CONTROL} />
            </div>
            <div className="space-y-2">
              <label className={FIELD_LABEL}>Session</label>
              <CustomSelect
                className={FIELD_CONTROL}
                value={session}
                onChange={setSession}
                options={[
                  { value: 'Sydney', label: 'Sydney' },
                  { value: 'Tokyo', label: 'Tokyo' },
                  { value: 'London', label: 'London' },
                  { value: 'NewYork', label: 'New York' }
                ]}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="modal-setup" className={FIELD_LABEL}>Setup</label>
              <SetupCombobox
                id="modal-setup"
                value={setupId}
                onValueChange={setSetupId}
                setups={setups}
                onCreateSetup={createSetup}
                onRestoreSetup={archiveSetup ? restoreSetup : undefined}
                onError={(message) => toast?.(message, 'error')}
                className={FIELD_CONTROL}
              />
            </div>
          </div>

          <div className="space-y-2">
              <label htmlFor="modal-strategy-input" className={FIELD_LABEL}>Strategies</label>
              <div className="flex flex-col justify-center rounded-xl border border-border/40 bg-card min-h-11 px-2 py-1.5 cursor-text focus-within:border-primary/50 transition-colors" onClick={() => document.getElementById('modal-strategy-input')?.focus()}>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {strategies.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">
                      {tag}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setStrategies(s => s.filter((_, idx) => idx !== i)); }} className="hover:text-foreground opacity-70 hover:opacity-100">
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    id="modal-strategy-input"
                    type="text"
                    value={strategyInput}
                    onChange={e => setStrategyInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const val = strategyInput.trim().replace(/^,+|,+$/g, '');
                        if (val && !strategies.includes(val)) {
                          setStrategies([...strategies, val]);
                        }
                        setStrategyInput('');
                      } else if (e.key === 'Backspace' && !strategyInput && strategies.length > 0) {
                        setStrategies(strategies.slice(0, -1));
                      }
                    }}
                    placeholder={strategies.length ? "Add tag..." : "e.g. Breakout, Trend"}
                    className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-foreground placeholder:text-muted-foreground/50 min-w-[80px]"
                  />
                </div>
              </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={FIELD_LABEL}>Direction</label>
              <div className="flex bg-muted rounded-xl p-1 gap-1 border border-border/50 h-11">
                <button
                  type="button"
                  aria-pressed={direction === 'BUY'}
                  onClick={() => setDirection('BUY')}
                  className={`flex-1 rounded-lg text-xs font-black transition-all ${direction === 'BUY' ? 'bg-win/15 text-win ring-1 ring-inset ring-win/40' : 'hover:bg-background text-muted-foreground hover:text-foreground'}`}
                >BUY</button>
                <button
                  type="button"
                  aria-pressed={direction === 'SELL'}
                  onClick={() => setDirection('SELL')}
                  className={`flex-1 rounded-lg text-xs font-black transition-all ${direction === 'SELL' ? 'bg-loss/15 text-loss ring-1 ring-inset ring-loss/40' : 'hover:bg-background text-muted-foreground hover:text-foreground'}`}
                >SELL</button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="modal-lots" className={FIELD_LABEL}>Lot Size</label>
              <input
                id="modal-lots"
                type="text"
                inputMode="decimal"
                value={formData.lots}
                onChange={handleNumericChange('lots')}
                className={cn('input-premium w-full text-sm font-bold', FIELD_CONTROL)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="modal-entry" className={FIELD_LABEL}>Entry Price</label>
              <input
                id="modal-entry"
                type="text"
                inputMode="decimal"
                value={formData.entry}
                onChange={handleNumericChange('entry')}
                className={cn('input-premium w-full text-sm font-bold', FIELD_CONTROL)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="modal-exit" className={FIELD_LABEL}>Exit Price</label>
              <input
                id="modal-exit"
                type="text"
                inputMode="decimal"
                value={formData.exit}
                onChange={handleNumericChange('exit')}
                className={cn('input-premium w-full text-sm font-bold', FIELD_CONTROL)}
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-muted/40 border border-border/50 flex justify-between items-center animate-in slide-in-from-top-2">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Recalculated Impact</span>
              <span className={`text-xl font-black ${derivedMetrics.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(derivedMetrics.pnl, true)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">Efficiency</span>
              <span className="text-sm font-black text-foreground">{derivedMetrics.pips} Pips {derivedMetrics.rr ? `· R:R ${derivedMetrics.rr}` : ''}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="modal-note" className={FIELD_LABEL}>Notes</label>
            <textarea
              id="modal-note"
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              className="input-premium h-24 w-full resize-none p-4 text-xs leading-relaxed"
            />
          </div>

          {/* Screenshots Upload & Edit Zone */}
          <div className="space-y-2 text-left">
            <label className={cn(FIELD_LABEL, 'flex justify-between')}>
              <span>Analysis Screenshots</span>
              {!isPaidPlan(plan) && <span className="text-[8px] font-black uppercase tracking-widest text-primary flex items-center gap-1"><LockFill className="w-2.5 h-2.5" /> Pro Feature</span>}
            </label>

            {isPaidPlan(plan) ? (
              <div className="space-y-3">
                <div className="relative border border-dashed border-border/60 hover:border-primary/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 bg-muted/10 group hover:bg-muted/20">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <CloudArrowUp className="w-7 h-7 text-muted-foreground/60 group-hover:text-primary group-hover:scale-110 transition-all duration-300" />
                  <span className="text-[11px] font-black text-foreground/80 uppercase tracking-widest">
                    {uploading ? `Uploading (${uploadProgress}%)...` : 'Drag & Drop or Click to Add Screenshots'}
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">PNG, JPG or WEBP (Max 5MB each)</span>
                </div>

                {uploading && (
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/10">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                {formData.screenshots && formData.screenshots.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {formData.screenshots.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl border border-border/50 overflow-hidden bg-muted group/thumb shadow-sm">
                        <img
                          src={url}
                          alt="screenshot preview"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setActiveImageUrl(url)}
                        />
                        <button
                          type="button"
                          onClick={() => removeScreenshot(i)}
                          className="absolute top-1 right-1 min-h-7 min-w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-100 transition-opacity shadow active:scale-90"
                          title="Delete screenshot"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => { requireProFeature(plan, setShowPricingModal, toast, 'attach analysis screenshots'); }}
                className="border border-dashed border-border/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-muted/5 opacity-60 hover:opacity-100 transition-opacity"
              >
                <LockFill className="w-6 h-6 text-muted-foreground/40" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Attach Analysis Screenshots</span>
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 mt-1">Unlock with Pro</span>
              </div>
            )}
          </div>

          <button type="submit" className="w-full btn-primary h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Check2Circle className="w-4 h-4" />
            Update Operation Log
          </button>
        </form>

        {/* Lightbox for zooming screenshots */}
        <AnimatePresence>
          {activeImageUrl && (
            <ImageViewerModal imageUrl={activeImageUrl} onClose={() => setActiveImageUrl(null)} />
          )}
        </AnimatePresence>
    </AppDialog>
  );
}

