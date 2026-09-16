import { useDeferredValue, useState } from 'react';
import { CircleDollarSign, ReceiptText, SearchX, Trash2, TriangleAlert } from 'lucide-react';
import { usePayments } from '../hooks';
import { CursorPager, EmptyState, ErrorState, FilterSelect, LoadingState, Metric, Notice, PageShell, ReasonDialog, SearchField, StatusBadge, TableFrame, formatDate, formatMoney, type LooseRecord } from './_shared';

type PaymentRecord = LooseRecord & { id: string; status?: string };

export function PaymentsPage() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [status, setStatus] = useState('ALL');
  const state = usePayments({ status: status === 'ALL' ? undefined : status as 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PENDING', pageSize: 15 }) as LooseRecord;
  const payments = (state.payments ?? state.data ?? []) as PaymentRecord[];
  const [deleteTarget, setDeleteTarget] = useState<PaymentRecord | null>(null);
  const [notice, setNotice] = useState('');
  const pending = Boolean(state.isPending ?? state.pending);
  const filtered = [...payments].filter((payment) => {
    const text = [payment.id, payment.latestCaptureId, payment.latestOrderId, payment.subscriptionId, payment.planId, payment.payerEmail, payment.customerId, payment.userName, payment.userEmail, payment.userId].filter(Boolean).join(' ').toLowerCase();
    return (!deferredSearch || text.includes(deferredSearch)) && (status === 'ALL' || payment.status === status);
  }).sort((a, b) => new Date(String(b.date ?? b.createdAt ?? 0)).getTime() - new Date(String(a.date ?? a.createdAt ?? 0)).getTime());
  const successful = payments.filter((payment) => payment.status === 'SUCCESS');
  const gross = successful.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

  const remove = async (reason: string) => {
    if (!deleteTarget) return;
    setNotice('');
    try { await state.deletePayment({ paymentId: deleteTarget.id, reason }); setNotice(`Payment record ${String(deleteTarget.latestCaptureId ?? deleteTarget.latestOrderId ?? deleteTarget.id)} deleted.`); setDeleteTarget(null); }
    catch { setNotice('The payment record could not be deleted.'); }
  };

  return <PageShell title="Payments" eyebrow="Billing ledger" description="Audit PayPal payment outcomes and remove only invalid unsettled records. PayPal refunds stay outside this console." actions={<StatusBadge tone={state.error ? 'danger' : 'success'}>{state.error ? 'Connection issue' : 'Live ledger'}</StatusBadge>}>
    {state.error && <ErrorState title="Payments could not refresh" message="Retry before changing the billing ledger." onRetry={state.refresh} />}
    {notice && <Notice tone={notice.includes('could not') ? 'danger' : 'success'}>{notice}</Notice>}
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Metric label="Gross received" value={state.isLoading ? '—' : formatMoney(gross)} icon={<CircleDollarSign size={18} />} />
      <Metric label="Transactions" value={state.isLoading ? '—' : payments.length.toLocaleString()} icon={<ReceiptText size={18} />} />
      <Metric label="Failed payments" value={state.isLoading ? '—' : payments.filter((payment) => payment.status === 'FAILED').length.toLocaleString()} icon={<TriangleAlert size={18} />} />
    </section>
    <section className="panel my-4"><div className="flex flex-col gap-3 lg:flex-row"><SearchField value={search} onChange={setSearch} label="Search payments" placeholder="Search PayPal capture, order, subscription, or payer" /><FilterSelect label="Payment status" value={status} onChange={setStatus}><option value="ALL">All statuses</option><option value="SUCCESS">Successful</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></FilterSelect></div></section>
    <TableFrame title="Transaction history" count={filtered.length}>
      {state.isLoading ? <LoadingState label="Loading payments" /> : filtered.length === 0 ? <EmptyState icon={payments.length ? <SearchX /> : <ReceiptText />} title={payments.length ? 'No matching payments on this page' : 'No payments yet'} message={payments.length ? 'Clear the search or continue to another page.' : 'Verified PayPal billing events will appear here.'} action={payments.length ? <button className="button" onClick={() => { setSearch(''); setStatus('ALL'); }}>Clear filters</button> : undefined} /> : <><div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm"><thead><tr className="border-b border-dark-border text-xs text-dark-text-muted"><th className="p-4">PayPal transaction</th><th className="p-4">Customer</th><th className="p-4">Subscription</th><th className="p-4">Date</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-dark-border">{filtered.map((payment) => <tr key={payment.id} className="hover:bg-white/5">
        <td className="p-4"><strong className="block font-mono text-xs text-white">{String(payment.latestCaptureId ?? 'Capture pending')}</strong><small className="font-mono text-dark-text-muted">Order {String(payment.latestOrderId ?? '—')}</small></td>
        <td className="p-4"><strong className="block text-white">{String(payment.userName ?? 'Unknown customer')}</strong><small className="block text-dark-text-muted">{String(payment.payerEmail ?? payment.userEmail ?? 'No payer email')}</small><small className="block font-mono text-dark-text-muted">Customer {String(payment.customerId ?? payment.userId ?? '—')}</small></td>
        <td className="p-4"><strong className="block font-mono text-xs text-white">{String(payment.subscriptionId ?? '—')}</strong><small className="font-mono text-dark-text-muted">Plan {String(payment.planId ?? '—')}</small></td>
        <td className="p-4 text-dark-text-muted">{formatDate(payment.date ?? payment.createdAt, true)}</td>
        <td className="p-4 font-semibold text-white">{formatMoney(payment.amount, String(payment.currency ?? 'USD'))}</td>
        <td className="p-4"><StatusBadge tone={payment.status === 'SUCCESS' ? 'success' : payment.status === 'FAILED' ? 'danger' : payment.status === 'REFUNDED' ? 'warning' : 'info'}>{String(payment.paymentStatus ?? payment.status ?? 'UNKNOWN')}</StatusBadge></td>
        <td className="p-4 text-right"><button className="icon-button text-red-400" disabled={pending || payment.status === 'SUCCESS' || payment.status === 'REFUNDED'} onClick={() => setDeleteTarget(payment)} aria-label={`Delete payment ${String(payment.latestCaptureId ?? payment.latestOrderId ?? payment.id)}`} title={payment.status === 'SUCCESS' || payment.status === 'REFUNDED' ? 'Settled records are retained for audit' : 'Delete invalid unsettled record'}><Trash2 size={16} /></button></td>
      </tr>)}</tbody></table></div><CursorPager page={Number(state.page ?? 1)} canPrevious={Boolean(state.canPreviousPage)} canNext={Boolean(state.canNextPage)} onPrevious={state.previousPage} onNext={state.nextPage} /></>}
    </TableFrame>
    <ReasonDialog open={Boolean(deleteTarget)} title="Delete this payment record?" description="This removes the admin ledger record only; it does not refund money in PayPal. Preserve records unless they are invalid or duplicated." confirmLabel="Delete payment record" pending={pending} onClose={() => setDeleteTarget(null)} onConfirm={remove} />
  </PageShell>;
}

export default PaymentsPage;
