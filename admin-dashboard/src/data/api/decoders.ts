import type {
  AdminDataFreshness,
  AdminHealth,
  AdminHealthCheck,
  Analytics,
  AnalyticsDateRange,
  AnalyticsTimeSeriesPoint,
  Announcement,
  Coupon,
  Overview,
  Payment,
  PayPalBillingCycle,
  Report,
  Subscription,
  SystemSettings,
  User,
  UserAnalytics,
  UserAnalyticsBreakdown,
  UserAnalyticsTimeSeriesPoint,
  UserAnalyticsTrade,
} from '../../domain/models';
import {
  boolean,
  dateString,
  enumValue,
  first,
  number,
  optionalArray,
  optionalBoolean,
  optionalDateString,
  optionalNumber,
  optionalString,
  record,
  string,
} from './runtime';

const USER_PLANS = ['FREE', 'PRO', 'GRACE'] as const;
const USER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
const SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'PAUSED', 'UNKNOWN'] as const;
const PAYMENT_STATUSES = ['SUCCESS', 'FAILED', 'REFUNDED', 'PENDING'] as const;
const REPORT_TYPES = ['BUG', 'FEATURE_REQUEST', 'SUPPORT'] as const;
const REPORT_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'] as const;
const COUPON_TYPES = ['PERCENT', 'FIXED'] as const;
const ANNOUNCEMENT_TARGETS = ['ALL', 'PRO_ONLY', 'FREE_ONLY'] as const;
const ANNOUNCEMENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
const ANNOUNCEMENT_LEVELS = ['INFO', 'WARNING', 'CRITICAL'] as const;
const FRESHNESS_STATUSES = ['FRESH', 'PARTIAL', 'STALE', 'UNKNOWN'] as const;
const HEALTH_CHECK_STATUSES = ['AVAILABLE', 'DEGRADED', 'UNAVAILABLE'] as const;

function nullableNumber(value: unknown, path: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  return number(value, path);
}

function normalizedFreshnessStatus(value: unknown, path: string): AdminDataFreshness['status'] {
  if (value === undefined || value === null || value === '') return 'UNKNOWN';
  if (typeof value === 'boolean') return value ? 'STALE' : 'FRESH';
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['partial', 'incomplete', 'sampled'].includes(normalized)) return 'PARTIAL';
    if (['current', 'fresh'].includes(normalized)) return 'FRESH';
    if (['stale', 'expired'].includes(normalized)) return 'STALE';
  }
  return enumValue(value, FRESHNESS_STATUSES, path);
}

function decodeFreshness(value: unknown, path: string, generatedAt: string): AdminDataFreshness {
  if (value === undefined || value === null) return { status: 'UNKNOWN', asOf: generatedAt };
  if (typeof value === 'string' || typeof value === 'boolean') {
    return { status: normalizedFreshnessStatus(value, path), asOf: generatedAt };
  }
  const source = record(value, path);
  const sampledValue = source.sampled;
  const sampled = sampledValue === undefined || sampledValue === null
    ? undefined
    : (() => {
      const counts = record(sampledValue, `${path}.sampled`);
      return {
        users: number(counts.users ?? 0, `${path}.sampled.users`),
        payments: number(counts.payments ?? 0, `${path}.sampled.payments`),
        reports: number(counts.reports ?? 0, `${path}.sampled.reports`),
      };
    })();
  const status = normalizedFreshnessStatus(first(source, 'status', 'state', 'stale'), `${path}.status`);
  return {
    status,
    asOf: optionalDateString(first(source, 'asOf', 'sourceUpdatedAt', 'updatedAt'), `${path}.asOf`) ?? generatedAt,
    ageSeconds: optionalNumber(first(source, 'ageSeconds', 'lagSeconds'), `${path}.ageSeconds`),
    source: optionalString(first(source, 'source', 'summarySource', 'semantics'), `${path}.source`),
    complete: optionalBoolean(source.complete, `${path}.complete`)
      ?? (status === 'FRESH' ? true : status === 'PARTIAL' ? false : undefined),
    scanned: optionalNumber(first(source, 'scanned', 'scannedTrades'), `${path}.scanned`),
    scanLimit: optionalNumber(first(source, 'scanLimit', 'tradeScanLimit', 'scanLimitPerCollection'), `${path}.scanLimit`),
    sampled,
  };
}

function normalizedHealthStatus(value: unknown, path: string): AdminHealthCheck['status'] {
  if (typeof value === 'boolean') return value ? 'AVAILABLE' : 'UNAVAILABLE';
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['ok', 'up', 'healthy', 'available', 'ready'].includes(normalized)) return 'AVAILABLE';
    if (['degraded', 'partial'].includes(normalized)) return 'DEGRADED';
    if (['down', 'failed', 'unhealthy', 'unavailable'].includes(normalized)) return 'UNAVAILABLE';
  }
  return enumValue(value, HEALTH_CHECK_STATUSES, path);
}

function decodeHealthCheck(value: unknown, path: string, fallbackName?: string): AdminHealthCheck {
  if (typeof value === 'string' || typeof value === 'boolean') {
    return {
      name: string(fallbackName, `${path}.name`),
      status: normalizedHealthStatus(value, `${path}.status`),
    };
  }
  const source = record(value, path);
  return {
    name: optionalString(source.name, `${path}.name`) ?? fallbackName ?? 'unknown',
    status: normalizedHealthStatus(first(source, 'status', 'state', 'ok'), `${path}.status`),
    message: optionalString(source.message, `${path}.message`),
  };
}

export function decodeAdminHealth(value: unknown, path = 'data'): AdminHealth {
  const source = record(value, path);
  const rawChecks = first(source, 'checks', 'services');
  const checks = rawChecks === undefined || rawChecks === null
    ? []
    : Array.isArray(rawChecks)
      ? rawChecks.map((item, index) => decodeHealthCheck(item, `${path}.checks[${index}]`))
      : Object.entries(record(rawChecks, `${path}.checks`)).map(([name, item]) => (
        decodeHealthCheck(item, `${path}.checks.${name}`, name)
      ));
  const rawAvailability = first(source, 'availability', 'available', 'status', 'ok');
  const status = normalizedHealthStatus(rawAvailability ?? true, `${path}.availability`);
  return {
    availability: status,
    generatedAt: dateString(first(source, 'generatedAt', 'checkedAt', 'serverTime', 'timestamp'), `${path}.generatedAt`),
    checks,
    message: optionalString(source.message, `${path}.message`),
  };
}

function normalizedPaymentStatus(value: unknown, path: string): Payment['status'] {
  if (typeof value !== 'string') return enumValue(value, PAYMENT_STATUSES, path);
  const normalized = value.toLowerCase();
  if (['captured', 'paid', 'completed', 'succeeded', 'success'].includes(normalized)) return 'SUCCESS';
  if (['failed', 'declined', 'denied', 'voided', 'expired', 'cancelled', 'canceled'].includes(normalized)) return 'FAILED';
  if (['refunded', 'partially_refunded', 'reversed'].includes(normalized)) return 'REFUNDED';
  if (['pending', 'created', 'approved', 'payer_action_required'].includes(normalized)) return 'PENDING';
  return enumValue(value, PAYMENT_STATUSES, path);
}

function decodePayPalBillingCycles(value: unknown, path: string): PayPalBillingCycle[] {
  return optionalArray(value, path, (entry, entryPath) => {
    const cycle = record(entry, entryPath);
    const rawTenureType = optionalString(first(cycle, 'tenureType', 'tenure_type'), `${entryPath}.tenureType`);
    return {
      tenureType: rawTenureType === undefined
        ? undefined
        : enumValue(rawTenureType, ['REGULAR', 'TRIAL'] as const, `${entryPath}.tenureType`),
      sequence: optionalNumber(cycle.sequence, `${entryPath}.sequence`),
      cyclesCompleted: optionalNumber(first(cycle, 'cyclesCompleted', 'cycles_completed'), `${entryPath}.cyclesCompleted`),
      cyclesRemaining: optionalNumber(first(cycle, 'cyclesRemaining', 'cycles_remaining'), `${entryPath}.cyclesRemaining`),
      totalCycles: optionalNumber(first(cycle, 'totalCycles', 'total_cycles'), `${entryPath}.totalCycles`),
    };
  });
}

function normalizedReportStatus(value: unknown, path: string): Report['status'] {
  if (value === 'in_review') return 'IN_PROGRESS';
  return enumValue(value, REPORT_STATUSES, path, 'OPEN');
}

function normalizedSubscriptionStatus(value: unknown, path: string): Subscription['status'] {
  if (value === undefined || value === null || value === '') return 'ACTIVE';
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (['cancelled', 'canceled'].includes(normalized)) return 'CANCELED';
    if (['past_due', 'past-due'].includes(normalized)) return 'PAST_DUE';
    if (normalized === 'suspended') return 'PAUSED';
    if (['approval_pending', 'approved'].includes(normalized)) return 'UNKNOWN';
  }
  return enumValue(value, SUBSCRIPTION_STATUSES, path, 'UNKNOWN');
}

function announcementTarget(value: unknown, path: string): Announcement['target'] {
  if (value === 'all') return 'ALL';
  if (value === 'free') return 'FREE_ONLY';
  if (value === 'pro') return 'PRO_ONLY';
  return enumValue(value, ANNOUNCEMENT_TARGETS, path, 'ALL');
}

export function decodeUser(value: unknown, path = 'data'): User {
  const source = record(value, path);
  const uid = string(first(source, 'uid', 'id'), `${path}.uid`);
  const subscriptionValue = source.subscription;
  const nestedSubscription = subscriptionValue !== undefined && subscriptionValue !== null;
  const subscriptionSource = nestedSubscription
    ? record(subscriptionValue, `${path}.subscription`)
    : source;
  const subscriptionId = optionalString(
    first(subscriptionSource, 'paypalSubscriptionId', 'subscriptionId', 'providerSubscriptionId'),
    `${path}.subscription.subscriptionId`,
  );
  const hasSubscription = nestedSubscription || subscriptionId !== undefined
    || first(source, 'subscriptionStatus', 'paypalStatus', 'nextBillingAt', 'nextBillingTime') !== undefined;
  const subscription = !hasSubscription
    ? undefined
    : (() => {
      const item = subscriptionSource;
      const rawStatus = optionalString(
        nestedSubscription
          ? first(item, 'status', 'subscriptionStatus', 'paypalStatus')
          : first(item, 'subscriptionStatus', 'paypalStatus', 'paymentStatus'),
        `${path}.subscription.status`,
      );
      return {
        provider: 'paypal' as const,
        subscriptionId,
        planId: optionalString(first(item, 'paypalPlanId', 'planId'), `${path}.subscription.planId`),
        payerEmail: optionalString(first(item, 'payerEmail', 'paypalPayerEmail', 'subscriberEmail'), `${path}.subscription.payerEmail`),
        customerId: optionalString(first(item, 'paypalPayerId', 'payerId', 'customerId'), `${path}.subscription.customerId`),
        status: rawStatus,
        autoRenew: optionalBoolean(item.autoRenew, `${path}.subscription.autoRenew`)
          ?? !['CANCELLED', 'CANCELED', 'EXPIRED'].includes(rawStatus?.toUpperCase() ?? ''),
        billingCycles: decodePayPalBillingCycles(first(item, 'billingCycles', 'cycleExecutions'), `${path}.subscription.billingCycles`),
        nextBillingAt: optionalDateString(first(item, 'nextBillingAt', 'nextBillingTime', 'nextBillingDate'), `${path}.subscription.nextBillingAt`),
        latestCaptureId: optionalString(first(item, 'latestCaptureId', 'captureId'), `${path}.subscription.latestCaptureId`),
        latestOrderId: optionalString(first(item, 'latestOrderId', 'orderId'), `${path}.subscription.latestOrderId`),
        expiresAt: optionalDateString(first(item, 'expiresAt', 'currentPeriodEnd'), `${path}.subscription.expiresAt`),
        startedAt: optionalDateString(first(item, 'startedAt', 'currentPeriodStart'), `${path}.subscription.startedAt`),
      };
    })();

  return {
    id: uid,
    uid,
    email: optionalString(source.email, `${path}.email`),
    name: optionalString(source.name, `${path}.name`),
    displayName: optionalString(source.displayName, `${path}.displayName`),
    firstName: optionalString(source.firstName, `${path}.firstName`),
    lastName: optionalString(source.lastName, `${path}.lastName`),
    plan: enumValue(source.plan, USER_PLANS, `${path}.plan`, 'FREE'),
    status: source.status === undefined
      ? (source.disabled === true ? 'SUSPENDED' : 'ACTIVE')
      : enumValue(source.status, USER_STATUSES, `${path}.status`, 'ACTIVE'),
    disabled: optionalBoolean(source.disabled, `${path}.disabled`) ?? false,
    emailVerified: optionalBoolean(source.emailVerified, `${path}.emailVerified`),
    country: optionalString(source.country, `${path}.country`),
    joinedDate: optionalDateString(source.joinedDate, `${path}.joinedDate`),
    createdAt: optionalDateString(source.createdAt, `${path}.createdAt`),
    updatedAt: optionalDateString(source.updatedAt, `${path}.updatedAt`),
    lastLogin: optionalDateString(source.lastLogin, `${path}.lastLogin`),
    lastSignInAt: optionalDateString(source.lastSignInAt, `${path}.lastSignInAt`),
    device: optionalString(source.device, `${path}.device`),
    loginHistory: optionalArray(source.loginHistory, `${path}.loginHistory`, (entry, entryPath) => {
      const history = record(entry, entryPath);
      return {
        date: dateString(history.date, `${entryPath}.date`),
        ip: optionalString(history.ip, `${entryPath}.ip`),
        device: optionalString(history.device, `${entryPath}.device`),
      };
    }),
    subscription,
    journalCount: optionalNumber(source.journalCount, `${path}.journalCount`),
    tradeCount: optionalNumber(source.tradeCount, `${path}.tradeCount`),
    totalJournalsLogged: optionalNumber(source.totalJournalsLogged, `${path}.totalJournalsLogged`),
    totalTradesLogged: optionalNumber(source.totalTradesLogged, `${path}.totalTradesLogged`),
    planExpiry: source.planExpiry === null ? null : optionalDateString(source.planExpiry, `${path}.planExpiry`),
    graceUntil: source.graceUntil === null ? null : optionalDateString(source.graceUntil, `${path}.graceUntil`),
    graceReason: source.graceReason === null ? null : optionalString(source.graceReason, `${path}.graceReason`),
    isTrial: optionalBoolean(source.isTrial, `${path}.isTrial`),
    mt5SyncEnabled: optionalBoolean(source.mt5SyncEnabled, `${path}.mt5SyncEnabled`),
    deletionState: source.deletionState === undefined || source.deletionState === null
      ? undefined
      : enumValue(source.deletionState, ['PENDING'] as const, `${path}.deletionState`),
    deletionRequestedAt: optionalDateString(source.deletionRequestedAt, `${path}.deletionRequestedAt`),
  };
}

export function decodeSubscription(value: unknown, path = 'data'): Subscription {
  const source = record(value, path);
  const userId = string(first(source, 'userId', 'uid', 'id'), `${path}.userId`);
  const providerSubscriptionId = optionalString(
    first(source, 'paypalSubscriptionId', 'subscriptionId', 'providerSubscriptionId'),
    `${path}.providerSubscriptionId`,
  );
  const paypalStatus = optionalString(first(source, 'paypalStatus', 'subscriptionStatus', 'paymentStatus', 'status'), `${path}.paypalStatus`);
  const status = normalizedSubscriptionStatus(paypalStatus, `${path}.status`);
  const decoded = {
    id: providerSubscriptionId ?? userId,
    userId,
    userEmail: optionalString(first(source, 'userEmail', 'email', 'payerEmail', 'paypalPayerEmail'), `${path}.userEmail`),
    userName: optionalString(first(source, 'userName', 'displayName'), `${path}.userName`),
    plan: enumValue(source.plan, USER_PLANS, `${path}.plan`, 'PRO'),
    status,
    autoRenew: optionalBoolean(source.autoRenew, `${path}.autoRenew`) ?? !['CANCELED', 'EXPIRED'].includes(status),
    customerId: optionalString(first(source, 'paypalPayerId', 'payerId', 'customerId'), `${path}.customerId`),
    providerSubscriptionId,
    planId: optionalString(first(source, 'paypalPlanId', 'planId'), `${path}.planId`),
    payerEmail: optionalString(first(source, 'payerEmail', 'paypalPayerEmail', 'subscriberEmail'), `${path}.payerEmail`),
    paypalStatus,
    billingCycles: decodePayPalBillingCycles(first(source, 'billingCycles', 'cycleExecutions'), `${path}.billingCycles`),
    nextBillingAt: optionalDateString(first(source, 'nextBillingAt', 'nextBillingTime', 'nextBillingDate'), `${path}.nextBillingAt`),
    latestCaptureId: optionalString(first(source, 'latestCaptureId', 'captureId'), `${path}.latestCaptureId`),
    latestOrderId: optionalString(first(source, 'latestOrderId', 'orderId'), `${path}.latestOrderId`),
    currentPeriodStart: optionalDateString(first(source, 'currentPeriodStart', 'startedAt'), `${path}.currentPeriodStart`),
    currentPeriodEnd: optionalDateString(first(source, 'currentPeriodEnd', 'expiresAt', 'planExpiry'), `${path}.currentPeriodEnd`),
    canceledAt: optionalDateString(source.canceledAt, `${path}.canceledAt`),
    createdAt: optionalDateString(source.createdAt, `${path}.createdAt`),
    updatedAt: optionalDateString(source.updatedAt, `${path}.updatedAt`),
  };
  return decoded;
}

export function decodePayment(value: unknown, path = 'data'): Payment {
  const source = record(value, path);
  return {
    id: string(source.id, `${path}.id`),
    userId: string(first(source, 'userId', 'uid'), `${path}.userId`),
    userName: optionalString(source.userName, `${path}.userName`),
    userEmail: optionalString(first(source, 'userEmail', 'email'), `${path}.userEmail`),
    amount: number(source.amount, `${path}.amount`),
    currency: optionalString(source.currency, `${path}.currency`) ?? 'USD',
    status: normalizedPaymentStatus(first(source, 'status', 'paymentStatus'), `${path}.status`),
    date: dateString(first(source, 'date', 'paidAt', 'createdAt'), `${path}.date`),
    subscriptionId: optionalString(first(source, 'paypalSubscriptionId', 'subscriptionId'), `${path}.subscriptionId`),
    planId: optionalString(first(source, 'paypalPlanId', 'planId'), `${path}.planId`),
    payerEmail: optionalString(first(source, 'payerEmail', 'paypalPayerEmail', 'subscriberEmail'), `${path}.payerEmail`),
    customerId: optionalString(first(source, 'paypalPayerId', 'payerId', 'customerId'), `${path}.customerId`),
    billingCycles: decodePayPalBillingCycles(first(source, 'billingCycles', 'cycleExecutions'), `${path}.billingCycles`),
    nextBillingAt: optionalDateString(first(source, 'nextBillingAt', 'nextBillingTime', 'nextBillingDate'), `${path}.nextBillingAt`),
    latestCaptureId: optionalString(first(source, 'latestCaptureId', 'captureId'), `${path}.latestCaptureId`),
    latestOrderId: optionalString(first(source, 'latestOrderId', 'orderId'), `${path}.latestOrderId`),
    paymentStatus: optionalString(first(source, 'paypalStatus', 'paymentStatus'), `${path}.paymentStatus`),
    refundedAmount: optionalNumber(source.refundedAmount, `${path}.refundedAmount`),
    type: optionalString(source.type, `${path}.type`),
    createdAt: optionalDateString(source.createdAt, `${path}.createdAt`),
    updatedAt: optionalDateString(source.updatedAt, `${path}.updatedAt`),
    paidAt: optionalDateString(source.paidAt, `${path}.paidAt`),
    refundedAt: optionalDateString(source.refundedAt, `${path}.refundedAt`),
    description: optionalString(source.description, `${path}.description`),
  };
}

export function decodeReport(value: unknown, path = 'data'): Report {
  const source = record(value, path);
  return {
    id: string(source.id, `${path}.id`),
    userId: string(first(source, 'userId', 'uid'), `${path}.userId`),
    userEmail: optionalString(source.userEmail, `${path}.userEmail`),
    userName: optionalString(source.userName, `${path}.userName`),
    type: enumValue(source.type, REPORT_TYPES, `${path}.type`),
    subject: string(source.subject, `${path}.subject`),
    message: string(first(source, 'message', 'body'), `${path}.message`),
    status: normalizedReportStatus(source.status, `${path}.status`),
    createdAt: dateString(source.createdAt, `${path}.createdAt`),
    updatedAt: optionalDateString(source.updatedAt, `${path}.updatedAt`),
    priority: source.priority === undefined ? undefined : enumValue(source.priority, ['LOW', 'MEDIUM', 'HIGH'] as const, `${path}.priority`),
    assigneeUid: optionalString(source.assigneeUid, `${path}.assigneeUid`),
    resolutionNote: optionalString(source.resolutionNote, `${path}.resolutionNote`),
    tradeId: optionalString(source.tradeId, `${path}.tradeId`),
    resolvedAt: optionalDateString(source.resolvedAt, `${path}.resolvedAt`),
  };
}

export function decodeCoupon(value: unknown, path = 'data'): Coupon {
  const source = record(value, path);
  const code = string(first(source, 'code', 'id'), `${path}.code`);
  return {
    id: optionalString(source.id, `${path}.id`) ?? code,
    code,
    discount: number(first(source, 'discount', 'discountValue'), `${path}.discount`),
    type: enumValue(first(source, 'type', 'discountType'), COUPON_TYPES, `${path}.type`),
    expiry: optionalDateString(first(source, 'expiry', 'expiresAt'), `${path}.expiry`),
    active: boolean(source.active, `${path}.active`),
    description: optionalString(source.description, `${path}.description`),
    currency: optionalString(source.currency, `${path}.currency`),
    maxRedemptions: optionalNumber(source.maxRedemptions, `${path}.maxRedemptions`),
    redeemedCount: optionalNumber(source.redeemedCount, `${path}.redeemedCount`) ?? 0,
    createdAt: optionalDateString(source.createdAt, `${path}.createdAt`),
    updatedAt: optionalDateString(source.updatedAt, `${path}.updatedAt`),
  };
}

export function decodeAnnouncement(value: unknown, path = 'data'): Announcement {
  const source = record(value, path);
  return {
    id: string(source.id, `${path}.id`),
    title: string(source.title, `${path}.title`),
    body: string(source.body, `${path}.body`),
    target: announcementTarget(first(source, 'target', 'audience'), `${path}.target`),
    date: dateString(first(source, 'date', 'publishedAt', 'startsAt', 'createdAt'), `${path}.date`),
    active: source.active === undefined
      ? source.status === 'published'
      : boolean(source.active, `${path}.active`),
    status: enumValue(source.status, ANNOUNCEMENT_STATUSES, `${path}.status`, 'DRAFT'),
    level: enumValue(source.level, ANNOUNCEMENT_LEVELS, `${path}.level`, 'INFO'),
    linkUrl: optionalString(source.linkUrl, `${path}.linkUrl`),
    dismissible: optionalBoolean(source.dismissible, `${path}.dismissible`) ?? true,
    startsAt: optionalDateString(source.startsAt, `${path}.startsAt`),
    endsAt: optionalDateString(source.endsAt, `${path}.endsAt`),
    publishedAt: optionalDateString(source.publishedAt, `${path}.publishedAt`),
    createdAt: optionalDateString(source.createdAt, `${path}.createdAt`),
    updatedAt: optionalDateString(source.updatedAt, `${path}.updatedAt`),
  };
}

export function decodeSettings(value: unknown, path = 'data'): SystemSettings {
  const source = record(value, path);
  return {
    supportEmail: optionalString(source.supportEmail, `${path}.supportEmail`) ?? 'support@xaujournal.com',
    allowRegistration: optionalBoolean(first(source, 'allowRegistration', 'signupsEnabled'), `${path}.allowRegistration`) ?? true,
    maintenanceMode: optionalBoolean(source.maintenanceMode, `${path}.maintenanceMode`) ?? false,
    trialDays: optionalNumber(source.trialDays, `${path}.trialDays`) ?? 0,
    announcementBannerEnabled: optionalBoolean(source.announcementBannerEnabled, `${path}.announcementBannerEnabled`) ?? true,
    reportsEnabled: optionalBoolean(source.reportsEnabled, `${path}.reportsEnabled`) ?? true,
    updatedAt: optionalDateString(source.updatedAt, `${path}.updatedAt`),
  };
}

export function decodeOverview(value: unknown, path = 'data'): Overview {
  const source = record(value, path);
  return {
    totalUsers: number(source.totalUsers, `${path}.totalUsers`),
    activeSubscriptions: number(source.activeSubscriptions, `${path}.activeSubscriptions`),
    totalPayments: number(source.totalPayments, `${path}.totalPayments`),
    openReports: number(source.openReports, `${path}.openReports`),
    generatedAt: dateString(source.generatedAt, `${path}.generatedAt`),
  };
}

export function decodeAnalytics(value: unknown, path = 'data'): Analytics {
  const source = record(value, path);
  const users = record(source.users, `${path}.users`);
  const payments = record(source.payments, `${path}.payments`);
  const reports = record(source.reports, `${path}.reports`);
  const generatedAt = dateString(source.generatedAt, `${path}.generatedAt`);
  const rangeValue = source.range;
  const rangeSource = rangeValue === undefined || rangeValue === null
    ? source
    : record(rangeValue, `${path}.range`);
  const range: AnalyticsDateRange = {
    from: optionalDateString(rangeSource.from, `${path}.range.from`),
    to: optionalDateString(rangeSource.to, `${path}.range.to`),
    timezone: optionalString(rangeSource.timezone, `${path}.range.timezone`),
    field: optionalString(rangeSource.field, `${path}.range.field`),
  };
  const timeSeries = optionalArray(first(source, 'timeSeries', 'series'), `${path}.timeSeries`, (item, itemPath): AnalyticsTimeSeriesPoint => {
    const point = record(item, itemPath);
    return {
      date: dateString(first(point, 'date', 'period', 'timestamp'), `${itemPath}.date`),
      newUsers: number(first(point, 'newUsers', 'users') ?? 0, `${itemPath}.newUsers`),
      payments: number(first(point, 'payments', 'totalPayments') ?? 0, `${itemPath}.payments`),
      settledPayments: number(first(point, 'settledPayments', 'settled') ?? 0, `${itemPath}.settledPayments`),
      failedPayments: number(first(point, 'failedPayments', 'failed') ?? 0, `${itemPath}.failedPayments`),
      revenue: number(point.revenue ?? 0, `${itemPath}.revenue`),
      openedReports: number(first(point, 'openedReports', 'openReports', 'reports') ?? 0, `${itemPath}.openedReports`),
      resolvedReports: number(first(point, 'resolvedReports', 'resolved') ?? 0, `${itemPath}.resolvedReports`),
    };
  });
  return {
    users: {
      total: number(users.total, `${path}.users.total`),
      free: number(users.free, `${path}.users.free`),
      pro: number(users.pro, `${path}.users.pro`),
      grace: number(users.grace, `${path}.users.grace`),
    },
    payments: {
      total: number(payments.total, `${path}.payments.total`),
      settled: number(payments.settled, `${path}.payments.settled`),
      failed: number(payments.failed, `${path}.payments.failed`),
      revenue: payments.revenue === null ? null : number(payments.revenue, `${path}.payments.revenue`),
    },
    reports: {
      open: number(reports.open, `${path}.reports.open`),
      resolved: number(reports.resolved, `${path}.reports.resolved`),
    },
    range,
    timeSeries,
    generatedAt,
    freshness: decodeFreshness(source.freshness, `${path}.freshness`, generatedAt),
  };
}

function decodeUserAnalyticsBreakdown(value: unknown, path: string): UserAnalyticsBreakdown {
  const source = record(value, path);
  return {
    key: string(first(source, 'key', 'id', 'code', 'name'), `${path}.key`),
    name: string(first(source, 'name', 'label', 'key', 'code'), `${path}.name`),
    tradeCount: number(first(source, 'tradeCount', 'totalTrades', 'trades') ?? 0, `${path}.tradeCount`),
    wins: number(source.wins ?? 0, `${path}.wins`),
    losses: number(source.losses ?? 0, `${path}.losses`),
    breakEven: number(first(source, 'breakEven', 'breakeven') ?? 0, `${path}.breakEven`),
    winRate: nullableNumber(source.winRate, `${path}.winRate`),
    totalPnl: number(first(source, 'totalPnl', 'netPnl', 'pnl') ?? 0, `${path}.totalPnl`),
    expectancy: nullableNumber(source.expectancy, `${path}.expectancy`),
  };
}

function normalizedTradeStatus(value: unknown, path: string): UserAnalyticsTrade['status'] {
  if (value === undefined || value === null || value === '') return 'UNKNOWN';
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['open', 'active', 'running'].includes(normalized)) return 'OPEN';
    if (['closed', 'complete', 'completed'].includes(normalized)) return 'CLOSED';
  }
  return enumValue(value, ['OPEN', 'CLOSED', 'UNKNOWN'] as const, path);
}

function normalizedTradeDirection(value: unknown, path: string): UserAnalyticsTrade['direction'] {
  if (value === undefined || value === null || value === '') return 'UNKNOWN';
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['buy', 'long'].includes(normalized)) return 'BUY';
    if (['sell', 'short'].includes(normalized)) return 'SELL';
  }
  return enumValue(value, ['BUY', 'SELL', 'UNKNOWN'] as const, path);
}

function normalizedTradeOutcome(value: unknown, path: string): UserAnalyticsTrade['outcome'] {
  if (value === undefined || value === null || value === '') return 'UNKNOWN';
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['win', 'won', 'profit'].includes(normalized)) return 'WIN';
    if (['loss', 'lost'].includes(normalized)) return 'LOSS';
    if (['be', 'break_even', 'break-even', 'breakeven'].includes(normalized)) return 'BREAK_EVEN';
  }
  return enumValue(value, ['WIN', 'LOSS', 'BREAK_EVEN', 'UNKNOWN'] as const, path);
}

function decodeUserAnalyticsTrade(value: unknown, path: string): UserAnalyticsTrade {
  const source = record(value, path);
  return {
    id: string(source.id, `${path}.id`),
    symbol: optionalString(first(source, 'symbol', 'instrument'), `${path}.symbol`),
    status: normalizedTradeStatus(source.status, `${path}.status`),
    direction: normalizedTradeDirection(first(source, 'direction', 'side', 'type'), `${path}.direction`),
    outcome: normalizedTradeOutcome(first(source, 'outcome', 'result'), `${path}.outcome`),
    openedAt: optionalDateString(first(source, 'openedAt', 'openTime', 'entryTime'), `${path}.openedAt`),
    closedAt: optionalDateString(first(source, 'closedAt', 'closeTime', 'exitTime', 'date'), `${path}.closedAt`),
    pnl: optionalNumber(first(source, 'pnl', 'netPnl', 'profit', 'profitLoss'), `${path}.pnl`),
    pips: optionalNumber(source.pips, `${path}.pips`),
    setup: optionalString(first(source, 'setup', 'setupName', 'setupId', 'strategy'), `${path}.setup`),
    session: optionalString(first(source, 'session', 'sessionCode'), `${path}.session`),
  };
}

export function decodeUserAnalytics(value: unknown, path = 'data'): UserAnalytics {
  const source = record(value, path);
  const summary = record(source.summary, `${path}.summary`);
  const grossProfit = number(summary.grossProfit ?? 0, `${path}.summary.grossProfit`);
  const grossLoss = number(summary.grossLoss ?? 0, `${path}.summary.grossLoss`);
  const generatedAt = dateString(source.generatedAt, `${path}.generatedAt`);
  return {
    summary: {
      tradeCount: number(first(summary, 'tradeCount', 'totalTrades', 'trades') ?? 0, `${path}.summary.tradeCount`),
      wins: number(summary.wins ?? 0, `${path}.summary.wins`),
      losses: number(summary.losses ?? 0, `${path}.summary.losses`),
      breakEven: number(first(summary, 'breakEven', 'breakeven', 'breakEvens') ?? 0, `${path}.summary.breakEven`),
      winRate: nullableNumber(summary.winRate, `${path}.summary.winRate`),
      totalPnl: number(first(summary, 'totalPnl', 'netPnl', 'pnl') ?? 0, `${path}.summary.totalPnl`),
      totalPips: number(summary.totalPips ?? 0, `${path}.summary.totalPips`),
      grossProfit,
      grossLoss,
      profitFactor: summary.profitFactor === undefined
        ? (grossLoss > 0 ? grossProfit / grossLoss : null)
        : nullableNumber(summary.profitFactor, `${path}.summary.profitFactor`),
      expectancy: nullableNumber(summary.expectancy, `${path}.summary.expectancy`),
      longs: number(summary.longs ?? 0, `${path}.summary.longs`),
      shorts: number(summary.shorts ?? 0, `${path}.summary.shorts`),
      journalCount: number(first(summary, 'journalCount', 'totalJournals', 'journals', 'journalEntries') ?? 0, `${path}.summary.journalCount`),
    },
    timeSeries: optionalArray(first(source, 'timeSeries', 'series'), `${path}.timeSeries`, (item, itemPath): UserAnalyticsTimeSeriesPoint => {
      const point = record(item, itemPath);
      return {
        date: dateString(first(point, 'date', 'period', 'timestamp'), `${itemPath}.date`),
        tradeCount: number(first(point, 'tradeCount', 'totalTrades', 'trades') ?? 0, `${itemPath}.tradeCount`),
        wins: number(point.wins ?? 0, `${itemPath}.wins`),
        losses: number(point.losses ?? 0, `${itemPath}.losses`),
        breakEven: number(first(point, 'breakEven', 'breakeven') ?? 0, `${itemPath}.breakEven`),
        totalPnl: number(first(point, 'totalPnl', 'netPnl', 'pnl') ?? 0, `${itemPath}.totalPnl`),
        cumulativePnl: optionalNumber(point.cumulativePnl, `${itemPath}.cumulativePnl`),
      };
    }),
    setups: optionalArray(source.setups, `${path}.setups`, decodeUserAnalyticsBreakdown),
    sessions: optionalArray(source.sessions, `${path}.sessions`, decodeUserAnalyticsBreakdown),
    recentTrades: optionalArray(source.recentTrades, `${path}.recentTrades`, decodeUserAnalyticsTrade),
    nextPageToken: optionalString(source.nextPageToken, `${path}.nextPageToken`),
    generatedAt,
    freshness: decodeFreshness(source.freshness, `${path}.freshness`, generatedAt),
  };
}
