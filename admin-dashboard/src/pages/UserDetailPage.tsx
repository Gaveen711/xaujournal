import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, BadgeCheck, CalendarClock, CalendarDays, CreditCard, KeyRound, Mail, MapPin, ShieldAlert, Trash2, UserRound, WalletCards } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { UserAccessEditor } from '../components/users/UserAccessEditor';
import { UserAnalyticsSection } from '../components/users/UserAnalyticsSection';
import { canonicalUserId, describeAdminError, displayUserName } from '../components/users/adminUserUi';
import '../components/users/users.css';
import type { UserUpdate } from '../domain/models';
import { useAdminHealth, usePayments, useUser, useUserActions, useUserAnalytics } from '../hooks';
import { EmptyState, ErrorState, LoadingState, Metric, Notice, PageShell, Panel, ReasonDialog, StatusBadge, formatDate, formatMoney } from './_shared';

type PendingMutation = {
  kind: 'update';
  updates: UserUpdate;
  title: string;
  description: string;
  success: string;
} | {
  kind: 'delete';
  title: string;
  description: string;
};

interface PageNotice {
  tone: 'danger' | 'success';
  message: string;
}

function RecordField({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return <div className="admin-record-field">
    <span className="admin-record-field__icon" aria-hidden="true">{icon}</span>
    <div><dt>{label}</dt><dd>{children}</dd></div>
  </div>;
}

export function UserDetailPage() {
  const { uid: routeUid = '' } = useParams();
  const navigate = useNavigate();
  const state = useUser(routeUid);
  const user = state.data;
  const uid = user ? canonicalUserId(user) : '';
  const actions = useUserActions();
  const health = useAdminHealth();
  const paymentState = usePayments({ userId: uid || routeUid, pageSize: 10 });
  const analyticsState = useUserAnalytics(uid, { pageSize: 10 });
  const [notice, setNotice] = useState<PageNotice | null>(null);
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);
  const pending = actions.isPending;
  const requestFailed = Boolean(state.error || actions.mutationError || paymentState.error || analyticsState.error);
  const degraded = Boolean(requestFailed || health.isDegraded || health.availability === 'UNAVAILABLE');
  const apiBlocksMutation = requestFailed || !health.canMutate;
  const requiredRequestRefreshing = state.isFetching || paymentState.isFetching || analyticsState.isFetching;
  const mutationsDisabled = pending || requiredRequestRefreshing || apiBlocksMutation;

  useEffect(() => {
    if (apiBlocksMutation) setPendingMutation(null);
  }, [apiBlocksMutation]);

  if (state.isLoading) return <PageShell title="User detail"><LoadingState label="Loading user profile" /></PageShell>;
  if (state.error || !user) {
    const failure = state.error
      ? describeAdminError(state.error, 'user lookup')
      : { title: 'User not found', message: 'No account was returned for this canonical UID.' };
    return <PageShell title="User detail"><ErrorState title={failure.title} message={failure.message} onRetry={() => void state.refresh()} /><Link className="button mt-4" to="/users"><ArrowLeft size={16} />Back to users</Link></PageShell>;
  }

  const name = displayUserName(user);
  const payments = paymentState.payments.filter((payment) => payment.userId === uid);
  const paid = payments.filter((payment) => payment.status === 'SUCCESS').reduce((sum, payment) => sum + payment.amount, 0);
  const paymentError = paymentState.error ? describeAdminError(paymentState.error, 'payment-history request') : null;

  const reviewUpdate = (updates: UserUpdate, summary: string) => {
    actions.resetMutation();
    setNotice(null);
    setPendingMutation({
      kind: 'update',
      updates,
      title: `Confirm changes to ${name}`,
      description: `The following protected account controls will change: ${summary}. Enter the operator reason for the audit log. High-impact authorization, MFA, and recent-reauthentication policy must be enforced by the backend.`,
      success: `${name}'s account controls were updated.`,
    });
  };

  const reviewDelete = () => {
    actions.resetMutation();
    setNotice(null);
    setPendingMutation({
      kind: 'delete',
      title: `Request deletion for ${name}?`,
      description: 'This recoverable request immediately suspends access and revokes API keys. Customer records remain retained until a separate reviewed deletion workflow completes. Enter the incident, policy, or customer-request reason for the audit log.',
    });
  };

  const confirmMutation = async (reason: string) => {
    if (!pendingMutation || apiBlocksMutation) return;
    try {
      if (pendingMutation.kind === 'delete') {
        await actions.deleteUser({ userId: uid, reason });
        navigate('/users', { replace: true });
        return;
      }
      await actions.updateUser({ userId: uid, updates: pendingMutation.updates, reason });
      await Promise.all([state.refresh(), analyticsState.refresh()]);
      setNotice({ tone: 'success', message: pendingMutation.success });
      setPendingMutation(null);
    } catch (error) {
      const failure = describeAdminError(error, pendingMutation.kind === 'delete' ? 'account deletion' : 'account update');
      setNotice({ tone: 'danger', message: `${failure.title}: ${failure.message}` });
    }
  };

  return <PageShell
    title={name}
    eyebrow="Customer record"
    description={uid}
    actions={<>
      <Link className="button" to="/users"><ArrowLeft size={16} />Users</Link>
      <button className="button button--danger" type="button" disabled={mutationsDisabled} title={mutationsDisabled ? 'Unavailable until the admin API health check is available' : 'Suspend access and request reviewed deletion'} onClick={reviewDelete}><Trash2 size={16} />Request deletion</button>
    </>}
  >
    {health.availability === 'CHECKING' && <Notice>Verifying admin API health. Account mutations remain disabled until the check succeeds.</Notice>}
    {degraded && !health.error && <Notice tone="danger">The admin API is degraded or a required request failed. Existing data may be stale, and account mutations are disabled until all required services recover.</Notice>}
    {health.error && <Notice tone="danger">{describeAdminError(health.error, 'health check').message} Account mutations remain disabled.</Notice>}
    {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}

    <section className="grid grid-cols-1 gap-4 md:grid-cols-4" aria-label="Account summary">
      <Metric label="Plan" value={user.plan} icon={<BadgeCheck size={18} />} />
      <Metric label="Status" value={user.status} icon={<ShieldAlert size={18} />} />
      <Metric label="Trades" value={(user.totalTradesLogged ?? user.tradeCount ?? 0).toLocaleString()} icon={<WalletCards size={18} />} />
      <Metric label="Revenue" value={formatMoney(paid)} detail="Loaded successful payments" icon={<CreditCard size={18} />} />
    </section>

    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Panel className="xl:col-span-2" title="Account details" meta={<StatusBadge tone={degraded ? 'warning' : 'success'}>{degraded ? 'Stale' : 'Current'}</StatusBadge>}>
        <dl className="admin-record-grid">
          <RecordField icon={<KeyRound />} label="Canonical UID"><code>{uid}</code></RecordField>
          <RecordField icon={<Mail />} label="Email">{user.email ?? 'Not recorded'}{user.emailVerified === undefined ? '' : user.emailVerified ? ' · verified' : ' · unverified'}</RecordField>
          <RecordField icon={<MapPin />} label="Country">{user.country ?? 'Not recorded'}</RecordField>
          <RecordField icon={<CalendarDays />} label="Joined">{formatDate(user.createdAt ?? user.joinedDate, true)}</RecordField>
          <RecordField icon={<UserRound />} label="Last login">{formatDate(user.lastLogin ?? user.lastSignInAt, true)}</RecordField>
          <RecordField icon={<WalletCards />} label="Plan expiry">{formatDate(user.planExpiry ?? user.subscription?.expiresAt, true)}</RecordField>
          <RecordField icon={<CreditCard />} label="PayPal subscription"><code>{user.subscription?.subscriptionId ?? 'Not connected'}</code></RecordField>
          <RecordField icon={<KeyRound />} label="PayPal plan"><code>{user.subscription?.planId ?? 'Not connected'}</code></RecordField>
          <RecordField icon={<Mail />} label="PayPal payer">{user.subscription?.payerEmail ?? 'Not recorded'}{user.subscription?.customerId ? ` · ${user.subscription.customerId}` : ''}</RecordField>
          <RecordField icon={<CalendarClock />} label="Next PayPal billing">{formatDate(user.subscription?.nextBillingAt, true)}</RecordField>
          <RecordField icon={<Trash2 />} label="Deletion workflow">{user.deletionState === 'PENDING' ? `Pending since ${formatDate(user.deletionRequestedAt, true)}` : 'Not requested'}</RecordField>
        </dl>
      </Panel>

      <Panel title="Login history">
        {user.loginHistory.length ? <div className="space-y-2">{user.loginHistory.slice(0, 8).map((entry, index) => <div className="rounded-xl border border-dark-border bg-white/5 p-3" key={`${entry.date}-${index}`}><strong className="block text-sm text-white">{entry.device ?? 'Unknown device'}</strong><small className="block text-dark-text-muted">{formatDate(entry.date, true)}</small><small className="font-mono text-dark-text-muted">{entry.ip ?? 'IP not recorded'}</small></div>)}</div> : <EmptyState icon={<UserRound />} title="No login history" message="Recorded device sessions will appear here." />}
      </Panel>

      <Panel className="xl:col-span-2" title="Access controls" meta={<StatusBadge tone={degraded ? 'danger' : 'warning'}>{degraded ? 'Locked' : 'Reason required'}</StatusBadge>}>
        <UserAccessEditor user={user} disabled={apiBlocksMutation} pending={pending} onReview={reviewUpdate} />
      </Panel>

      <Panel title="Payment history">
        {paymentState.isLoading
          ? <LoadingState label="Loading payments" />
          : paymentError
            ? <ErrorState title={paymentError.title} message={paymentError.message} onRetry={() => void paymentState.refresh()} />
            : payments.length === 0
              ? <EmptyState icon={<CreditCard />} title="No payment records" message="Verified billing events for this customer will appear here." />
              : <div className="space-y-2">{payments.slice(0, 10).map((payment) => <div className="activity-row" key={payment.id}><span className="activity-row__icon"><CreditCard size={15} /></span><div className="flex-1"><strong>{payment.latestCaptureId ?? payment.latestOrderId ?? payment.id}</strong><small>{formatDate(payment.date ?? payment.createdAt, true)} · {payment.subscriptionId ? `PayPal subscription ${payment.subscriptionId}` : 'PayPal payment'}</small></div><b>{formatMoney(payment.amount, payment.currency)}</b><StatusBadge tone={payment.status === 'SUCCESS' ? 'success' : payment.status === 'FAILED' ? 'danger' : 'warning'}>{payment.paymentStatus ?? payment.status}</StatusBadge></div>)}</div>}
      </Panel>
    </div>

    <UserAnalyticsSection data={analyticsState.data} error={analyticsState.error} isLoading={analyticsState.isLoading} isFetching={analyticsState.isFetching} page={analyticsState.page} canPreviousPage={analyticsState.canPreviousPage} onPreviousPage={analyticsState.previousPage} onNextPage={analyticsState.nextPage} onRetry={() => void analyticsState.refresh()} />

    <ReasonDialog open={Boolean(pendingMutation)} title={pendingMutation?.title ?? 'Confirm account action'} description={pendingMutation?.description ?? ''} confirmLabel={pendingMutation?.kind === 'delete' ? 'Request deletion' : 'Apply changes'} pending={pending} onClose={() => setPendingMutation(null)} onConfirm={confirmMutation} />
  </PageShell>;
}

export default UserDetailPage;
