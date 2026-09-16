import type { IsoDateString, PaginationParams } from './common';

export type UserPlan = 'FREE' | 'PRO' | 'GRACE';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type UserDeletionState = 'PENDING';

export interface PayPalBillingCycle {
  tenureType?: 'REGULAR' | 'TRIAL';
  sequence?: number;
  cyclesCompleted?: number;
  cyclesRemaining?: number;
  totalCycles?: number;
}

export interface SubscriptionDetails {
  provider?: 'paypal';
  subscriptionId?: string;
  planId?: string;
  payerEmail?: string;
  customerId?: string;
  status?: string;
  autoRenew: boolean;
  billingCycles: PayPalBillingCycle[];
  nextBillingAt?: IsoDateString;
  latestCaptureId?: string;
  latestOrderId?: string;
  expiresAt?: IsoDateString;
  startedAt?: IsoDateString;
}

export interface LoginHistoryEntry {
  date: IsoDateString;
  ip?: string;
  device?: string;
}

export interface User {
  id: string;
  uid: string;
  email?: string;
  name?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  plan: UserPlan;
  status: UserStatus;
  disabled: boolean;
  emailVerified?: boolean;
  country?: string;
  joinedDate?: IsoDateString;
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
  lastLogin?: IsoDateString;
  lastSignInAt?: IsoDateString;
  device?: string;
  loginHistory: LoginHistoryEntry[];
  subscription?: SubscriptionDetails;
  journalCount?: number;
  tradeCount?: number;
  totalJournalsLogged?: number;
  totalTradesLogged?: number;
  planExpiry?: IsoDateString | null;
  graceUntil?: IsoDateString | null;
  graceReason?: string | null;
  isTrial?: boolean;
  mt5SyncEnabled?: boolean;
  deletionState?: UserDeletionState;
  deletionRequestedAt?: IsoDateString;
}

export interface UserListParams extends PaginationParams {
  search?: string;
  plan?: UserPlan;
  status?: UserStatus;
}

export type UserUpdate = Partial<Pick<User,
  | 'plan'
  | 'status'
>> & {
  planExpiry?: IsoDateString | null;
  graceUntil?: IsoDateString | null;
  graceReason?: string | null;
  isTrial?: boolean;
  mt5SyncEnabled?: boolean;
};
