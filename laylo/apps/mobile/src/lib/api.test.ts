/**
 * Unit tests for the fetch wrapper + SecureStore-backed token helpers.
 * Mocks both `expo-secure-store` (via jest.setup.js) and global fetch.
 */
import * as SecureStore from 'expo-secure-store';
import { api, setToken, removeToken } from './api';

// Reset the in-memory SecureStore + fetch mock between every test.
afterEach(() => {
  jest.restoreAllMocks();
  // @ts-expect-error — test helper attached in jest.setup.js
  SecureStore.__reset?.();
});

function mockFetchOnce(response: { status: number; body?: unknown; ok?: boolean }) {
  const ok = response.ok ?? (response.status >= 200 && response.status < 300);
  const fetchMock = jest.fn(async () => ({
    ok,
    status: response.status,
    json: async () => response.body ?? {},
  }));
  // @ts-expect-error — patching global for the test.
  global.fetch = fetchMock;
  return fetchMock;
}

describe('token helpers', () => {
  it('round-trips a token via SecureStore', async () => {
    await setToken('jwt-abc');
    // The internal getToken isn't exported; reach in via SecureStore.
    const stored = await SecureStore.getItemAsync('life_admin_access_token');
    expect(stored).toBe('jwt-abc');

    await removeToken();
    const cleared = await SecureStore.getItemAsync('life_admin_access_token');
    expect(cleared).toBeNull();
  });
});

describe('api.get()', () => {
  it('injects Authorization header when a token is present', async () => {
    await setToken('jwt-xyz');
    const fetchMock = mockFetchOnce({ status: 200, body: { ok: true } });

    await api.get('/api/dashboard');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer jwt-xyz');
  });

  it('omits Authorization header when no token is set', async () => {
    const fetchMock = mockFetchOnce({ status: 200, body: {} });

    await api.get('/api/health');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('returns parsed JSON on success', async () => {
    mockFetchOnce({ status: 200, body: { success: true, data: { foo: 1 } } });

    const out = await api.get<{ success: boolean; data: { foo: number } }>('/x');

    expect(out).toEqual({ success: true, data: { foo: 1 } });
  });

  it('returns undefined for 204 No Content', async () => {
    mockFetchOnce({ status: 204, body: null });
    const out = await api.get('/x');
    expect(out).toBeUndefined();
  });
});

describe('ApiError', () => {
  it('throws on 4xx with the right shape', async () => {
    mockFetchOnce({ status: 401, body: { message: 'nope' } });

    await expect(api.get('/secure')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      data: { message: 'nope' },
    });
  });

  it('throws on 5xx', async () => {
    mockFetchOnce({ status: 503, body: { error: 'down' } });

    await expect(api.get('/down')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
    });
  });

  it('survives a non-JSON error body', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    }));
    // @ts-expect-error global patch
    global.fetch = fetchMock;

    await expect(api.get('/boom')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      data: null,
    });
  });
});

describe('api.post() / put() / delete()', () => {
  it('sends a JSON body for POST', async () => {
    const fetchMock = mockFetchOnce({ status: 200, body: { ok: true } });

    await api.post('/api/auth/login', { email: 'a@b.com', password: 'pw' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.com', password: 'pw' }));
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('does NOT set a body for DELETE', async () => {
    const fetchMock = mockFetchOnce({ status: 204, body: null });

    await api.delete('/api/x/1');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });
});
