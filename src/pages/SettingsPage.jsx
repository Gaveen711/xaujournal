import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { Eye, EyeSlash } from 'react-bootstrap-icons';
import { auth } from '../firebase';
import { useToast } from '../components/ToastContext';
import { useSessionBrokerAccounts } from '../app/di/AuthenticatedSessionContext.jsx';
import { useAppTheme } from '../hooks/useAppTheme';
import { isPaidPlan } from '../lib/entitlements.js';
import { accentTemplateName } from '../lib/accentTemplates.js';
import { DEFAULT_DISCIPLINE_RULES, RULE_BOUNDS, RULE_IDS } from '../lib/disciplineRules.js';
import { SectionCard } from '../components/app/SectionCard';
import { StatusSquare } from '../components/app/StatusSquare';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../components/ui/alert-dialog';

export function SettingsPage() {
  const {
    plan,
    expiry,
    openPortal,
    setShowPricingModal,
    setShowThemeSelector,
    resetTrades,
    resetWallet,
    updateMonthlyGoal,
    deleteAllEntries,
    disciplineRules,
    saveDisciplineRules,
    setups,
    deleteSetup,
    isSavingDisciplineRules,
    isLoadingDisciplineRules,
  } = useOutletContext();
  const navigate = useNavigate();
  const toast = useToast();
  // Read straight from the session context rather than threading two more
  // values through the outlet: the provider already owns the single broker
  // list every dashboard surface shares.
  const { accounts: brokerAccounts, removeAccount: removeBrokerAccount } = useSessionBrokerAccounts();
  const { isLightMode, toggleTheme, currentTemplate } = useAppTheme();
  const user = auth.currentUser;

  const usernameId = useId();
  const darkModeId = useId();

  const providerIds = useMemo(
    () => user?.providerData?.map((provider) => provider.providerId) || [],
    [user]
  );
  const canChangePassword = providerIds.includes('password');

  const [displayName, setDisplayName] = useState(
    user?.displayName || user?.email?.split('@')[0] || ''
  );
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resettingTerminal, setResettingTerminal] = useState(false);

  // Rule values are edited as text (a half-typed "1." is not a number yet), so
  // the draft holds strings and the clamp happens once, on save, inside
  // saveDisciplineRules.
  const [ruleDraft, setRuleDraft] = useState(() => toRuleDraft(disciplineRules));
  // The stored map keeps a stable identity unless a rule actually changed, so
  // this re-seeds on a real remote edit (and on the clamped values coming back
  // after a save) rather than on every user-doc snapshot.
  useEffect(() => {
    setRuleDraft(toRuleDraft(disciplineRules));
  }, [disciplineRules]);

  const activeRuleCount = RULE_IDS.filter((ruleId) => ruleDraft[ruleId].enabled).length;

  const setRuleField = (ruleId, patch) =>
    setRuleDraft((current) => ({ ...current, [ruleId]: { ...current[ruleId], ...patch } }));

  const planLabel = plan === 'pro' ? 'Pro' : plan === 'grace' ? 'Grace' : 'Basic';
  const expiryLabel = expiry ? new Date(expiry).toLocaleDateString() : null;

  const handleSaveName = async (event) => {
    event.preventDefault();
    const name = displayName.trim();

    if (name.length < 2) {
      toast('Username must be at least 2 characters.', 'error');
      return;
    }

    setSavingName(true);
    try {
      await updateProfile(user, { displayName: name });
      toast('Username updated.', 'success');
    } catch (error) {
      toast(getAuthErrorMessage(error), 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();

    if (!canChangePassword) {
      toast('Password changes are only available for email/password accounts.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      toast('New password must be at least 8 characters.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast('New passwords do not match.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await updatePassword(user, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      toast('Password updated securely.', 'success');
    } catch (error) {
      toast(getAuthErrorMessage(error), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveRules = async (event) => {
    event.preventDefault();
    const next = {};
    for (const ruleId of RULE_IDS) {
      // Strings, not parsed numbers: clampRuleValue turns a blank or
      // unparseable entry into the rule's default, so nothing undefined or NaN
      // can reach Firestore.
      next[ruleId] = { enabled: ruleDraft[ruleId].enabled, value: ruleDraft[ruleId].value };
    }
    try {
      await saveDisciplineRules?.(next);
      toast('Discipline rules saved.', 'success');
    } catch (error) {
      toast(error?.message || 'Could not save your discipline rules.', 'error');
    }
  };

  const handleResetTerminal = async () => {
    setResetDialogOpen(false);
    setResettingTerminal(true);
    try {
      // Every store the workspace owns, not just trades. Setup tags and
      // discipline rules used to survive a "reset", which left the terminal
      // carrying the old account's configuration.
      //
      // Default setups are catalog scaffolding rather than user data, and
      // `deleteSetup` refuses them outright — only the ones the user created
      // go. Wiping the trades leaves every setup at zero references, so none
      // of these deletions can orphan a tag.
      const customSetups = (setups || []).filter((setup) => !setup.isDefault);
      // A connected broker would immediately re-import the trades that were
      // just wiped, so "start fresh" has to include the connection itself.
      const connectedBrokers = brokerAccounts || [];

      // Independent writes, so they run together rather than in series. The
      // journal clear is one batched pass instead of two writes per entry.
      // allSettled, not all: a single rejection must not hide whether the
      // rest of the wipe landed — a half-reset reported as a flat failure is
      // what makes users hit the button again.
      const steps = [
        ['trades', resetTrades?.()],
        ['wallet', resetWallet?.()],
        ['monthly goal', updateMonthlyGoal?.(1000)],
        ['journal entries', deleteAllEntries?.()],
        ['discipline rules', saveDisciplineRules?.(DEFAULT_DISCIPLINE_RULES)],
        ...customSetups.map((setup) => [`setup "${setup.name}"`, deleteSetup?.(setup.id)]),
        ...connectedBrokers.map((account) => [
          `broker connection (${account.server || account.accountName || account.id})`,
          removeBrokerAccount?.(account.id),
        ]),
      ];
      const outcomes = await Promise.allSettled(steps.map(([, task]) => task));

      // Broker sync permissions are per-user device state, so they belong to
      // the workspace being reset. (The two keys cleared here previously —
      // 'xau-weekly-summary' and 'xau-trade-reminders' — are written by
      // nothing in the app; removing them was a no-op.) Theme, template and
      // sidebar preferences are deliberately kept: they are app chrome, not
      // terminal data.
      localStorage.removeItem('xau-sync-permissions-current');
      if (user?.uid) localStorage.removeItem(`xau-sync-permissions-${user.uid}`);

      const failed = outcomes
        .map((outcome, index) => (outcome.status === 'rejected' ? steps[index][0] : null))
        .filter(Boolean);
      if (failed.length) {
        toast(`Terminal reset finished, but this could not be cleared: ${failed.join(', ')}.`, 'error');
      } else {
        toast('Terminal reset complete.', 'success');
      }
    } catch (error) {
      toast(error?.message || 'Terminal reset failed. Please try again.', 'error');
    } finally {
      setResettingTerminal(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-medium text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Identity, access, billing, and workspace controls.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusSquare
            state={plan === 'pro' ? 'on' : plan === 'grace' ? 'attn' : 'off'}
            label={`Plan: ${planLabel}`}
          >
            {planLabel} plan
          </StatusSquare>
          <span className="font-mono text-[11px] text-muted-foreground">
            {expiryLabel ? `Renews ${expiryLabel}` : 'Renewal —'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5 xl:items-start">
        <div className="flex flex-col gap-6 xl:col-span-3">
          <SectionCard
            surface
            title="Account identity"
            description="This name appears in your dashboard, account menu, and shared trade context."
          >
            <form onSubmit={handleSaveName} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor={usernameId} className="text-xs font-medium text-muted-foreground">
                    Username
                  </label>
                  <Input
                    id={usernameId}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Email</span>
                  <p className="flex h-8 min-w-0 items-center rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground">
                    <span className="truncate">{user?.email || 'No email linked'}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Keep the display name short so it fits collapsed navigation and shared trade cards.
                </p>
                <Button type="submit" disabled={savingName} className="w-full sm:w-auto">
                  {savingName ? 'Saving…' : 'Save username'}
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            surface
            title="Password"
            description={
              canChangePassword
                ? 'Use a strong password with at least 8 characters.'
                : 'Your account uses a social login provider, so password changes are handled by that provider.'
            }
          >
            <form onSubmit={handleSavePassword} className="flex flex-col gap-4">
              <fieldset
                disabled={!canChangePassword || savingPassword}
                className="grid grid-cols-1 gap-4 disabled:opacity-50 lg:grid-cols-2"
              >
                <PasswordInput
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                />
                <PasswordInput
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />
              </fieldset>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  You may be asked to sign in again before sensitive security changes are accepted.
                </p>
                <Button
                  type="submit"
                  disabled={!canChangePassword || savingPassword}
                  className="w-full sm:w-auto"
                >
                  {savingPassword ? 'Updating…' : 'Update password'}
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            surface
            title="Discipline rules"
            description="Flags trades that break your own rules. Advisory only — nothing is ever blocked."
            meta={`${activeRuleCount} of ${RULE_IDS.length} active`}
          >
            <form onSubmit={handleSaveRules} className="flex flex-col gap-4">
              <div className="flex flex-col gap-4">
                <RuleRow
                  label="Max trades per day"
                  hint="Flag every trade past this count."
                  bounds={RULE_BOUNDS.maxTradesPerDay}
                  rule={ruleDraft.maxTradesPerDay}
                  disabled={isLoadingDisciplineRules || isSavingDisciplineRules}
                  onToggle={(enabled) => setRuleField('maxTradesPerDay', { enabled })}
                  onValueChange={(value) => setRuleField('maxTradesPerDay', { value })}
                />

                <RuleRow
                  label="Max risk per trade"
                  hint="Flag trades risking more than this."
                  bounds={RULE_BOUNDS.maxRiskPercent}
                  rule={ruleDraft.maxRiskPercent}
                  disabled={isLoadingDisciplineRules || isSavingDisciplineRules}
                  onToggle={(enabled) => setRuleField('maxRiskPercent', { enabled })}
                  onValueChange={(value) => setRuleField('maxRiskPercent', { value })}
                  caveat="attn"
                  caveatText="Risk rule needs an account balance — set your wallet balance or enable the balance permission. Broker-synced trades without a stop loss are skipped."
                />

                <RuleRow
                  label="Revenge-trade window"
                  hint="Flag entries taken inside a cooldown after a loss."
                  bounds={RULE_BOUNDS.revengeWindow}
                  rule={ruleDraft.revengeWindow}
                  disabled={isLoadingDisciplineRules || isSavingDisciplineRules}
                  onToggle={(enabled) => setRuleField('revengeWindow', { enabled })}
                  onValueChange={(value) => setRuleField('revengeWindow', { value })}
                  caveatText="Uses real entry times. Manually logged trades carry only log time and are skipped by this rule."
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Values outside a rule&apos;s range are pulled back to it when you save.
                </p>
                <Button
                  type="submit"
                  disabled={isLoadingDisciplineRules || isSavingDisciplineRules}
                  className="w-full sm:w-auto"
                >
                  {isSavingDisciplineRules ? 'Saving…' : 'Save rules'}
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            surface
            title="Protected workspace"
            description="Sensitive billing, password, and sync changes stay grouped away from everyday dashboard actions."
          >
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Resetting the terminal clears trades, wallet history, journal entries, your setup
                tags, discipline rules, and any connected broker. It cannot be undone.
              </p>
              <Button
                variant="destructive"
                disabled={resettingTerminal}
                onClick={() => setResetDialogOpen(true)}
                className="w-full shrink-0 sm:w-auto"
              >
                {resettingTerminal ? 'Resetting…' : 'Reset terminal'}
              </Button>
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6 xl:col-span-2">
          <SectionCard
            surface
            title="Subscription"
            description="Manage your plan, billing portal, and upgrade access."
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">Plan</span>
                <span className="text-sm text-foreground">{planLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">Renewal</span>
                {expiryLabel ? (
                  <span className="figure text-sm text-foreground">{expiryLabel}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
              <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <Button variant="outline" onClick={openPortal}>
                  Billing portal
                </Button>
                {!isPaidPlan(plan) && (
                  <Button onClick={() => setShowPricingModal?.(true)}>Upgrade</Button>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            surface
            title="Appearance"
            description="Adjust the dashboard color accent and light or dark mode."
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">Palette</span>
                <span className="text-sm text-foreground">
                  {accentTemplateName(currentTemplate)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label htmlFor={darkModeId} className="text-xs font-medium text-muted-foreground">
                  Dark mode
                </label>
                <Switch id={darkModeId} checked={!isLightMode} onCheckedChange={() => toggleTheme()} />
              </div>
              <div className="mt-1 grid grid-cols-1 gap-2">
                <Button variant="outline" onClick={() => setShowThemeSelector?.(true)}>
                  Change accent color
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            surface
            title="Broker sync"
            description="Review your MT4/MT5 connection, sync permissions, and account status."
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">Connection</span>
                <span className="text-sm text-foreground">Managed in Sync</span>
              </div>
              <Button variant="outline" onClick={() => navigate('/app/sync')}>
                Open sync settings
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={(open) => setResetDialogOpen(open)}>
        <AlertDialogContent overlayClassName="z-[70]" className="z-[80]">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the terminal?</AlertDialogTitle>
            <AlertDialogDescription>
              All trades, wallet history, journal entries, and your custom setup tags will be
              removed, any connected broker is disconnected, and discipline rules and the monthly
              goal return to their defaults. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleResetTerminal}>
              Reset terminal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Stored rules → the editable draft. Values become text; every rule is present. */
function toRuleDraft(rules) {
  const draft = {};
  for (const ruleId of RULE_IDS) {
    const stored = rules?.[ruleId];
    draft[ruleId] = {
      enabled: stored?.enabled === true,
      value: String(stored?.value ?? RULE_BOUNDS[ruleId].defaultValue),
    };
  }
  return draft;
}

/**
 * One rule: a switch, its bounded numeric input, and the copy explaining what
 * the flag means. The input is disabled while the switch is off — a number the
 * rule is not reading should not look editable.
 */
function RuleRow({ label, hint, bounds, rule, disabled, onToggle, onValueChange, caveat, caveatText }) {
  const switchId = useId();
  const inputId = useId();

  const handleNumericChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^[0-9]*[.,]?[0-9]*$/.test(val)) onValueChange(val.replace(',', '.'));
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={switchId} className="text-xs font-medium text-foreground">
          {label}
        </label>
        <div className="flex items-center gap-3">
          <div className="relative w-24">
            <label htmlFor={inputId} className="sr-only">
              {`${label} (${bounds.min}–${bounds.max} ${bounds.unit})`}
            </label>
            <Input
              id={inputId}
              type="text"
              inputMode="decimal"
              value={rule.value}
              onChange={handleNumericChange}
              disabled={disabled || !rule.enabled}
              className="figure pr-12"
            />
            <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">
              {bounds.unit}
            </span>
          </div>
          <Switch
            id={switchId}
            checked={rule.enabled}
            disabled={disabled}
            onCheckedChange={(checked) => onToggle(checked === true)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {hint} Range {bounds.min}–{bounds.max}.
      </p>
      {caveatText && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <StatusSquare state={caveat === 'attn' ? 'attn' : 'off'} label="Note" className="mt-1" />
          <span>{caveatText}</span>
        </p>
      )}
    </div>
  );
}

function PasswordInput({ label, value, onChange, autoComplete }) {
  const inputId = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={inputId}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="pr-9"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-0.5 -translate-y-1/2 text-muted-foreground"
          onClick={() => setVisible((prev) => !prev)}
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeSlash aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}

function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Current password is incorrect.';
    case 'auth/weak-password':
      return 'New password is too weak.';
    case 'auth/requires-recent-login':
      return 'Please sign in again before changing your password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again.';
    default:
      return error?.message || 'Something went wrong. Please try again.';
  }
}
