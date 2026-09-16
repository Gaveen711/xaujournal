import type { IsoDateString, PaginationParams } from './common';
import type { PayPalBillingCycle } from './User';

export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PENDING';

export interface Payment {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  date: IsoDateString;
  subscriptionId?: string;
  planId?: string;
  payerEmail?: string;
  customerId?: string;
  billingCycles: PayPalBillingCycle[];
  nextBillingAt?: IsoDateString;
  latestCaptureId?: string;
  latestOrderId?: string;
  paymentStatus?: string;
  refundedAmount?: number;
  type?: string;
  createdAt?: IsoDateString;
  updatedAt?: IsoDateString;
  paidAt?: IsoDateString;
  refundedAt?: IsoDateString;
  description?: string;
}

export interface PaymentListParams extends PaginationParams {
  status?: PaymentStatus;
  userId?: string;
  from?: IsoDateString;
  to?: IsoDateString;
}
