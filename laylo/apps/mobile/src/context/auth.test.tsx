/**
 * Tests for the AuthProvider lifecycle. We mock the `api` module so
 * no network is touched and we can deterministically resolve/reject
 * the /me hydrate + login/signup/logout calls.
 */
import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';

// Mock the api module BEFORE importing the provider.
jest.mock('../lib/api', () => {
  const setToken = jest.fn(async () => undefined);
  const removeToken = jest.fn(async () => undefined);
  const api = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  return { api, setToken, removeToken };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api, setToken, removeToken } = require('../lib/api');
import { AuthProvider, useAuth } from './auth';

function Probe() {
  const auth = useAuth();
  return (
    <>
      <Text testID="status">
        {auth.isHydrating ? 'hydrating' : auth.isAuthenticated ? 'in' : 'out'}
      </Text>
      <Text testID="user">{auth.user?.email ?? 'none'}</Text>
      <Pressable
        testID="login"
        onPress={() => auth.login('a@b.com', 'pw').catch(() => undefined)}
      >
        <Text>login</Text>
      </Pressable>
      <Pressable testID="logout" onPress={() => auth.logout()}>
        <Text>logout</Text>
      </Pressable>
    </>
  );
}

const FAKE_USER = {
  id: 'u1',
  name: 'Ada',
  email: 'ada@hive.dev',
  avatarUrl: null,
  plan: 'free',
  onboardingComplete: true,
};

describe('AuthProvider', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    setToken.mockClear();
    removeToken.mockClear();
  });

  it('starts isHydrating then flips to logged-out when /me fails', async () => {
    api.get.mockRejectedValueOnce(new Error('401'));

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    // Initial sync render — should be hydrating.
    expect(getByTestId('status').props.children).toBe('hydrating');

    await waitFor(() => {
      expect(getByTestId('status').props.children).toBe('out');
    });
    expect(removeToken).toHaveBeenCalled();
  });

  it('hydrates the user when /me succeeds', async () => {
    api.get.mockResolvedValueOnce({ success: true, data: { user: FAKE_USER } });

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('status').props.children).toBe('in');
    });
    expect(getByTestId('user').props.children).toBe('ada@hive.dev');
  });

  it('login() stores the token + sets user', async () => {
    api.get.mockRejectedValueOnce(new Error('no token'));
    api.post.mockResolvedValueOnce({
      success: true,
      data: { user: FAKE_USER, accessToken: 'jwt-1' },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(getByTestId('status').props.children).toBe('out'),
    );

    await act(async () => {
      fireEvent.press(getByTestId('login'));
    });

    await waitFor(() =>
      expect(getByTestId('status').props.children).toBe('in'),
    );
    expect(setToken).toHaveBeenCalledWith('jwt-1');
    expect(getByTestId('user').props.children).toBe('ada@hive.dev');
  });

  it('logout() clears the token + user', async () => {
    api.get.mockResolvedValueOnce({ success: true, data: { user: FAKE_USER } });
    api.post.mockResolvedValueOnce({ success: true, data: {} });

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(getByTestId('status').props.children).toBe('in'),
    );

    await act(async () => {
      fireEvent.press(getByTestId('logout'));
    });

    await waitFor(() =>
      expect(getByTestId('status').props.children).toBe('out'),
    );
    expect(removeToken).toHaveBeenCalled();
    expect(getByTestId('user').props.children).toBe('none');
  });

  it('logout() still clears local state if the server logout 5xxs', async () => {
    api.get.mockResolvedValueOnce({ success: true, data: { user: FAKE_USER } });
    api.post.mockRejectedValueOnce(new Error('500'));

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(getByTestId('status').props.children).toBe('in'),
    );

    await act(async () => {
      fireEvent.press(getByTestId('logout'));
    });

    await waitFor(() =>
      expect(getByTestId('status').props.children).toBe('out'),
    );
  });

  it('useAuth() throws when used outside the provider', () => {
    // Suppress React's expected error log noise.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    function Naked() {
      useAuth();
      return null;
    }
    expect(() => render(<Naked />)).toThrow(/within an AuthProvider/);
    spy.mockRestore();
  });
});
