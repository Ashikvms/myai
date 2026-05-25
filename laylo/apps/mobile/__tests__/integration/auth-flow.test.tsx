/**
 * Integration test for the email/password auth flow.
 *
 * Renders the real <AuthScreen /> with a mocked auth context, fills
 * the form, taps "Welcome back", and asserts:
 *   1. `login()` was called with the trimmed credentials.
 *   2. `router.replace('/(tabs)')` was triggered after success.
 *   3. A failing login surfaces a user-facing error message.
 */
import React from 'react';
import { fireEvent, render, waitFor, act } from '@testing-library/react-native';

// ── Strip out the breathing-bee visual so we don't need its native
// timing internals. The illustration mock is shared with other tests.
jest.mock('../../src/components/motion/breathing-bee', () => ({
  BreathingBee: ({ children }) => children,
}));

jest.mock('../../src/components/illustrations/bee', () => ({
  BeeStanding: () => null,
}));

// SafeAreaView in tests should be a plain wrapper.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...rest }) =>
      React.createElement(View, rest, children),
    SafeAreaProvider: ({ children }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Auth context mock — capture the spy fns so we can assert + reject.
// Jest hoists `jest.mock` calls above variable declarations, so any
// captured reference MUST be `mock`-prefixed to satisfy the safety
// guard. The factory closes over the prefixed handles.
const mockLogin = jest.fn();
const mockSignup = jest.fn();
jest.mock('../../src/context/auth', () => ({
  useAuth: () => ({
    login: mockLogin,
    signup: mockSignup,
    logout: jest.fn(),
    user: null,
    isAuthenticated: false,
    isHydrating: false,
    isLoading: false,
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const router = require('expo-router').__routerMock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AuthScreen = require('../../app/auth').default;

describe('AuthScreen integration', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockSignup.mockReset();
    router.replace.mockReset();
  });

  it('logs in with trimmed credentials and routes to the tabs', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    const { getByPlaceholderText, getAllByText } = render(<AuthScreen />);

    fireEvent.changeText(
      getByPlaceholderText('you@example.com'),
      '  ada@hive.dev  ',
    );
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'hunter22');

    // Two "Welcome back" texts exist: the tab + the submit button.
    // The button is the last one in source order.
    const matches = getAllByText('Welcome back');
    const submit = matches[matches.length - 1];

    await act(async () => {
      fireEvent.press(submit);
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('ada@hive.dev', 'hunter22');
    });
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows a friendly error when the API returns 401', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Request failed: POST /api/auth/login (401)'));

    const { getByPlaceholderText, getAllByText, findByText } = render(<AuthScreen />);

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'badpass');
    const matches = getAllByText('Welcome back');
    const submit = matches[matches.length - 1];

    await act(async () => {
      fireEvent.press(submit);
    });

    expect(await findByText(/Email or password incorrect/i)).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('refuses to submit when email is missing', async () => {
    const { getByPlaceholderText, getAllByText, findByText } = render(<AuthScreen />);

    fireEvent.changeText(getByPlaceholderText('••••••••'), 'hunter22');
    const matches = getAllByText('Welcome back');
    const submit = matches[matches.length - 1];

    await act(async () => {
      fireEvent.press(submit);
    });

    expect(await findByText('Email is required')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('rejects short passwords client-side', async () => {
    const { getByPlaceholderText, getAllByText, findByText } = render(<AuthScreen />);

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), '123');
    const matches = getAllByText('Welcome back');
    const submit = matches[matches.length - 1];

    await act(async () => {
      fireEvent.press(submit);
    });

    expect(await findByText(/at least 6 characters/i)).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
