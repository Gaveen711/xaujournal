import { useDeferredValue, useState } from 'react';
import { BadgeCheck, CalendarClock, RefreshCcw, SearchX } from 'lucide-react';
import { useSubscriptions } from '../hooks';
import { CursorPager, EmptyState, ErrorState, FilterSelect, LoadingState, Metric, PageShell, SearchField, StatusBadge, TableFrame, formatDate, type LooseRecord } from './_shared';

type SubscriptionRecord = LooseRecord & { id: string; status?: string; autoRenew?: boolean };

function billingCycleSummary(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return 'Not reported';
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return 'Unknown cycle';
    const cycle = entry as LooseRecord;
    const tenure = String(cycle.tenureType ?? 'regular').toLowerCase();
    const completed = Number(cycle.cyclesCompleted ?? 0);
    const remaining = cycle.cyclesRemaining === undefined ? null : Number(cycle.cyclesRemaining);
    return `${tenure}: ${completed} completed${remaining === null ? '' : `, ${remaining} remaining`}`;
  }).join(' · ');
}

export function SubscriptionsPage() {
  const state = useSubscriptions({ pageSize: 12 }) as LooseRecord;
  const subscriptions = (state.subscriptions ?? state.data ?? []) as SubscriptionRecord[];
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.toLowerCase().trim());
  const [status, setStatus] = useState('ALL');
  const [renewal, setRenewal] = useState('ALL');
  const filtered = subscriptions.filter((subscription) => {
    const text = [subscription.userName, subscription.userEmail, subscription.payerEmail, subscription.userId, subscription.customerId, subscription.providerSubscriptionId, subscription.planId, subscription.latestCaptureId, subscription.latestOrderId, subscription.id].filter(Boolean).join(' ').toLowerCase();
    return (!deferredSearch || text.includes(deferredSearch)) && (status === 'ALL' || subscription.status === status) && (renewal === 'ALL' || (renewal === 'ON') === (subscription.autoRenew !== false));
  });
  const active = subscriptions.filter((item) => item.status === 'ACTIVE' || !item.status);
  const cancelling = active.filter((item) => item.autoRenew === false);

  return <PageShell title="Subscriptions" eyebrow="Membership health" description="Review renewals, billing references, and customer access from one registry." actions={<StatusBadge tone={state.error ? 'danger' : 'success'}>{state.error ? 'Connection issue' : 'Live registry'}</StatusBadge>}>
    {state.error && <ErrorState title="Subscriptions could not refresh" message="Retry to load the latest renewal state." onRetry={state.refresh} />}
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Metric label="Active subscriptions" value={state.isLoading ? '—' : active.length.toLocaleString()} icon={<BadgeCheck size={18} />} />
      <Metric label="Renewal off" value={state.isLoading ? '—' : cancelling.length.toLocaleString()} icon={<CalendarClock size={18} />} />
      <Metric label="Auto-renew rate" value={state.isLoading ? '—' : `${active.length ? ((active.length - cancelling.length) / active.length * 100).toFixed(1) : '0.0'}%`} detail="Among active subscriptions" icon={<RefreshCcw size={18} />} />
    </section>
    <section className="panel my-4"><div className="flex flex-col gap-3 lg:flex-row"><SearchField value={search} onChange={setSearch} label="Search subscriptions" placeholder="Search PayPal subscription, plan, payer, or customer ID" /><div className="flex flex-wrap gap-2"><FilterSelect label="Subscription status" value={status} onChange={setStatus}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="PAST_DUE">Past due</option><option value="PAUSED">Suspended</option><option value="CANCELED">Canceled</option><option value="EXPIRED">Expired</option></FilterSelect><FilterSelect label="Renewal" value={renewal} onChange={setRenewal}><option value="ALL">Any renewal</option><option value="ON">Auto-renew on</option><option value="OFF">Auto-renew off</option></FilterSelect></div></div></section>
    <TableFrame title="Subscription registry" count={filtered.length}>
      {state.isLoading ? <LoadingState label="Loading subscriptions" /> : filtered.length === 0 ? <EmptyState icon={subscriptions.length ? <SearchX /> : <BadgeCheck />} title={subscriptions.length ? 'No matching subscriptions on this page' : 'No subscriptions yet'} message={subscriptions.length ? 'Adjust the filters or continue to another page.' : 'PayPal memberships will appear after the first approved subscription.'} action={subscriptions.length ? <button className="button" onClick={() => { setSearch(''); setStatus('ALL'); setRenewal('ALL'); }}>Clear filters</button> : undefined} /> : <><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead><tr className="border-b border-dark-border text-xs text-dark-text-muted"><th className="p-4">Member</th><th className="p-4">PayPal subscription</th><th className="p-4">Plan ID</th><th className="p-4">Billing cycles</th><th className="p-4">Next billing</th><th className="p-4">Status</th></tr></thead><tbody className="divide-y divide-dark-border">{filtered.map((item) => <tr key={item.id} className="hover:bg-white/5">
        <td className="p-4"><strong className="block text-white">{String(item.userName ?? item.displayName ?? item.payerEmail ?? item.userEmail ?? 'Unknown member')}</strong><small className="block text-dark-text-muted">{String(item.payerEmail ?? item.userEmail ?? 'No payer email')}</small><small className="block font-mono text-dark-text-muted">Customer {String(item.customerId ?? item.userId ?? '—')}</small></td>
        <td className="p-4 font-mono text-xs text-dark-text-muted">{String(item.providerSubscriptionId ?? item.subscriptionId ?? item.id)}</td>
        <td className="p-4 font-mono text-xs text-dark-text-muted">{String(item.planId ?? '—')}</td>
        <td className="p-4 text-xs text-dark-text-muted">{billingCycleSummary(item.billingCycles)}</td>
        <td className="p-4 text-dark-text-muted">{formatDate(item.nextBillingAt ?? item.currentPeriodEnd ?? item.expiresAt, true)}</td>
        <td className="p-4"><div className="flex flex-col items-start gap-1"><StatusBadge tone={item.status === 'ACTIVE' || !item.status ? 'success' : item.status === 'PAST_DUE' || item.status === 'PAUSED' ? 'danger' : 'warning'}>{String(item.paypalStatus ?? item.status ?? 'ACTIVE')}</StatusBadge><small className="text-dark-text-muted">Renewal {item.autoRenew === false ? 'off' : 'on'} · PayPal</small></div></td>
      </tr>)}</tbody></table></div><CursorPager page={Number(state.page ?? 1)} canPrevious={Boolean(state.canPreviousPage)} canNext={Boolean(state.canNextPage)} onPrevious={state.previousPage} onNext={state.nextPage} /></>}
    </TableFrame>
  </PageShell>;
}

export default SubscriptionsPage;
