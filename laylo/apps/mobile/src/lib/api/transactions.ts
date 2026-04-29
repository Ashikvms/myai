import { api } from '../api';
import type {
  ApiEnvelope,
  BankAccount,
  TransactionsListResponse,
  TransactionsQuery,
} from './types';

function buildQuery(query: TransactionsQuery = {}): string {
  const parts: string[] = [];
  const setIf = (k: string, v: string | undefined | null) => {
    if (v !== undefined && v !== null && v !== '') {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
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
    parts.push(`limit=${clamped}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
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
