// Shared types for Plaid + Transactions client API surface (web).
// These mirror the API contracts described in PLAID_INTEGRATION_SPEC.md
// section 4 and the Prisma schema in section 3.

export type PlaidItemStatus =
  | 'ACTIVE'
  | 'LOGIN_REQUIRED'
  | 'ERROR'
  | 'DISCONNECTED';

export type BankAccountType =
  | 'DEPOSITORY'
  | 'CREDIT'
  | 'LOAN'
  | 'INVESTMENT'
  | 'OTHER';

export type BankAccountSubtype =
  | 'CHECKING'
  | 'SAVINGS'
  | 'HSA'
  | 'CD'
  | 'MONEY_MARKET'
  | 'PAYPAL'
  | 'PREPAID'
  | 'CREDIT_CARD'
  | 'AUTO'
  | 'MORTGAGE'
  | 'STUDENT'
  | 'PERSONAL'
  | 'OTHER';

export interface PlaidItem {
  id: string;
  userId: string;
  plaidItemId: string;
  institutionId: string;
  institutionName: string;
  institutionLogo: string | null;
  status: PlaidItemStatus;
  errorCode: string | null;
  errorMessage: string | null;
  consentExpiresAt: string | null;
  lastSyncAt: string | null;
  lastWebhookAt: string | null;
  createdAt: string;
  updatedAt: string;
  accounts?: BankAccount[];
}

export interface BankAccount {
  id: string;
  userId: string;
  plaidItemId: string;
  plaidAccountId: string;
  name: string;
  officialName: string | null;
  mask: string | null;
  type: BankAccountType;
  subtype: BankAccountSubtype | null;
  isoCurrencyCode: string;
  currentBalance: string | number | null;
  availableBalance: string | number | null;
  creditLimit: string | number | null;
  isHidden: boolean;
  lastBalanceUpdate: string | null;
  createdAt: string;
  updatedAt: string;
  plaidItem?: { institutionName: string; institutionLogo?: string | null };
}

export interface Transaction {
  id: string;
  userId: string;
  bankAccountId: string;
  plaidTransactionId: string;
  amount: string | number;
  isoCurrencyCode: string;
  date: string;
  authorizedDate: string | null;
  name: string;
  merchantName: string | null;
  merchantLogoUrl: string | null;
  category: string | null;
  categoryDetailed: string | null;
  paymentChannel: string | null;
  pending: boolean;
  bankAccount?: { id: string; name: string; mask: string | null };
}

export interface TransactionsListResponse {
  items: Transaction[];
  nextCursor: string | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface PlaidLinkAccountInput {
  id: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
}

export interface ExchangeInput {
  publicToken: string;
  institutionId: string;
  institutionName: string;
  accounts: PlaidLinkAccountInput[];
}

export interface TransactionsQuery {
  from?: string;
  to?: string;
  accountId?: string;
  category?: string;
  merchant?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}

// ─── Item 28 Phase 3a — Detail drawer types ──────────────────────
//
// Mirrors apps/api/src/routes/transactions.ts GET /:id response shape.
// Numbers come back as JS numbers from the backend (Decimal → toNumber).

export interface TransactionDetailBankAccount {
  id: string;
  name: string;
  mask: string | null;
  type: BankAccountType;
  subtype: BankAccountSubtype | null;
  institutionName: string | null;
}

export interface TransactionDetailLink {
  id: string;
  name: string;
  amount: number;
  frequency: string | null;
}

export interface TransactionDetail {
  id: string;
  plaidTransactionId: string;
  amount: number;
  isoCurrencyCode: string;
  date: string;
  authorizedDate: string | null;
  name: string;
  merchantName: string | null;
  merchantLogoUrl: string | null;
  category: string | null;
  categoryDetailed: string | null;
  paymentChannel: string | null;
  pending: boolean;
  isoLocationCity: string | null;
  isoLocationRegion: string | null;
  isoLocationCountry: string | null;
  userNote: string | null;
  receiptUrl: string | null;
  userVerifiedMatch: boolean | null;
  bankAccount: TransactionDetailBankAccount;
  bill: TransactionDetailLink | null;
  subscription: TransactionDetailLink | null;
}

export interface TransactionPattern {
  merchantName: string | null;
  txCount: number;
  totalSpent: number;
  avgAmount: number;
  firstSeen: string | null;
}

export interface TransactionDetailResponse {
  transaction: TransactionDetail;
  pattern: TransactionPattern;
}

export interface TransactionNoteUpdateResponse {
  id: string;
  userNote: string | null;
}

export interface TransactionExplainResponse {
  explanation: string;
  generatedAt: string;
  mock: boolean;
}
