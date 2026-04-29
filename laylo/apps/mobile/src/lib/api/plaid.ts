import { api } from '../api';
import type { ApiEnvelope, ExchangeInput, PlaidItem } from './types';

export interface CreateLinkTokenResponse {
  linkToken: string;
  expiration: string;
}

export interface ExchangeResponse {
  plaidItemId: string;
  accountsLinked: number;
}

export interface SyncResponse {
  jobId: string;
}

export function createLinkToken(): Promise<CreateLinkTokenResponse> {
  return api
    .post<ApiEnvelope<CreateLinkTokenResponse>>('/api/plaid/link/token/create', {})
    .then((r) => r.data);
}

export function exchangePublicToken(
  input: ExchangeInput,
): Promise<ExchangeResponse> {
  return api
    .post<ApiEnvelope<ExchangeResponse>>('/api/plaid/link/token/exchange', input)
    .then((r) => r.data);
}

export function listItems(): Promise<PlaidItem[]> {
  return api
    .get<ApiEnvelope<PlaidItem[]>>('/api/plaid/items')
    .then((r) => r.data);
}

export function disconnectItem(id: string): Promise<{ id: string }> {
  return api
    .delete<ApiEnvelope<{ id: string }>>(`/api/plaid/items/${encodeURIComponent(id)}`)
    .then((r) => r.data);
}

export function triggerSync(id: string): Promise<SyncResponse> {
  return api
    .post<ApiEnvelope<SyncResponse>>(
      `/api/plaid/items/${encodeURIComponent(id)}/sync`,
      {},
    )
    .then((r) => r.data);
}
