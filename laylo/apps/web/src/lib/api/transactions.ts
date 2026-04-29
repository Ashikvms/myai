import { api } from '../api';
import type {
  ApiEnvelope,
  BankAccount,
  TransactionsListResponse,
  TransactionsQuery,
} from './types';

// Builds an URLSearchParams string only including values that are
// defined and non-empty. Limit is clamped to [1, 200] to match server
// validation in PLAID_INTEGRATION_SPEC.md §4.
function buildQuery(query: TransactionsQuery = {}): string {
  const params = new URLSearchParams();
  const setIf = (k: string, v: string | undefined | null) => {
    if (v !== undefined && v !== null && v !== '') {
      params.set(k, v);
    }
  };
  setIf('from', query.from);
  setIf('to', query.to);
  setIf('accountId', query.accountId);
  setIf('category', query.category);
  setIf('merchant', query.merchant);
  setIf('q', query.q);
  setIf('cursor', query.cursor);
  if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
    const clamped = Math.min(200, Math.max(1, Math.floor(query.limit)));
    params.set('limit', String(clamped));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listTransactions(
  query: TransactionsQuery = {},
): Promise<TransactionsListResponse> {
  return api
    .get<ApiEnvelope<TransactionsListResponse>>(
      `/api/transactions${buildQuery(query)}`,
    )
    .then((r) => r.data);
}

export function listAccounts(): Promise<BankAccount[]> {
  return api
    .get<ApiEnvelope<BankAccount[]>>(`/api/accounts`)
    .then((r) => r.data);
}
