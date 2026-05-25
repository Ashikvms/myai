/**
 * Integration test for the Home (dashboard) tab.
 *
 * Wires the real screen against a sandboxed QueryClient + mocked auth
 * + mocked api modules. We aren't testing the visual chrome — just
 * the data → DOM flow: loading spinner shows, then stat values
 * render, then a task row appears.
 *
 * The screen does heavy work (Reanimated, SVGs, bottom-sheet) — we
 * mock the high-cost children at the module boundary so the test
 * stays under 2 s and never touches the native bridge.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks for screen children that drag in native deps ─────────────
jest.mock('../../src/components/ai', () => {
  const React = require('react');
  return {
    AiBottomSheet: () => null,
    AskAiButton: () => null,
    SparkleIcon: () => null,
    useAiSheet: () => ({
      open: jest.fn(),
      close: jest.fn(),
      visible: false,
      prompt: '',
    }),
  };
});

jest.mock('../../src/components/illustrations/bee', () => ({
  BeeSleeping: () => null,
  BeeStanding: () => null,
}));

jest.mock('../../src/components/motion/animated-number', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    AnimatedNumber: ({ value, format, ...rest }) => (
      <Text {...rest}>{format ? format(value) : String(value)}</Text>
    ),
  };
});

// ── Mock the data layer ────────────────────────────────────────────
jest.mock('../../src/lib/api/transactions', () => ({
  listAccounts: jest.fn(),
  listTransactions: jest.fn(),
}));

jest.mock('../../src/lib/api/resources', () => ({
  getDashboard: jest.fn(),
}));

jest.mock('../../src/context/auth', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Ada Lovelace', email: 'ada@hive.dev' },
    isAuthenticated: true,
    isHydrating: false,
    isLoading: false,
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { listAccounts, listTransactions } = require('../../src/lib/api/transactions');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDashboard } = require('../../src/lib/api/resources');

// Import the screen after mocks are wired.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HomeScreen = require('../../app/(tabs)/index').default;

function withQuery(node: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

const SAMPLE_DASHBOARD = {
  pendingTasks: 3,
  todayTasks: [
    {
      id: 't-1',
      title: 'Pay electric bill',
      description: null,
      status: 'PENDING',
      priority: 'HIGH',
      dueDate: null,
      completedAt: null,
    },
  ],
  billsDueSoon: [
    { id: 'b-1', name: 'Electric', amount: 142, nextDueDate: '2026-06-01', category: null, frequency: 'MONTHLY', status: 'OPEN', autopay: false },
    { id: 'b-2', name: 'Water', amount: 38, nextDueDate: '2026-06-04', category: null, frequency: 'MONTHLY', status: 'OPEN', autopay: false },
  ],
  totalMonthlyBills: 180,
  totalMonthlySubs: 42,
  activeSubscriptions: 4,
  upcomingAppointments: [],
  pendingReminders: 0,
  expiringDocuments: [],
  recentDocuments: [],
  connectedAccounts: { count: 0, totalBalance: 0, totalDebt: 0, accounts: [] },
  recentTransactions: [],
};

describe('HomeScreen integration', () => {
  beforeEach(() => {
    listAccounts.mockResolvedValue([]);
    listTransactions.mockResolvedValue({ items: [], nextCursor: null });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a loading spinner while the dashboard query is in flight', async () => {
    // Never resolves — query stays loading.
    getDashboard.mockReturnValue(new Promise(() => {}));

    const { findByText } = render(withQuery(<HomeScreen />));

    expect(await findByText(/loading the hive/i)).toBeTruthy();
  });

  it('renders the three stat values after the dashboard query resolves', async () => {
    getDashboard.mockResolvedValueOnce(SAMPLE_DASHBOARD);

    const { findByText, getByText } = render(withQuery(<HomeScreen />));

    // Wait for the first computed value to land.
    await findByText('3'); // pendingTasks

    // billsDueSoon.length = 2, totalMonthlySubs formatter prints "$42".
    expect(getByText('2')).toBeTruthy();
    expect(getByText('$42')).toBeTruthy();
  });

  it('renders todays tasks list with the task title', async () => {
    getDashboard.mockResolvedValueOnce(SAMPLE_DASHBOARD);

    const { findByText } = render(withQuery(<HomeScreen />));

    expect(await findByText('Pay electric bill')).toBeTruthy();
  });

  it('shows the inbox-zero empty state when there are no tasks', async () => {
    getDashboard.mockResolvedValueOnce({
      ...SAMPLE_DASHBOARD,
      todayTasks: [],
    });

    const { findByText } = render(withQuery(<HomeScreen />));

    expect(await findByText(/inbox zero unlocked/i)).toBeTruthy();
  });

  it('greets the user by first name', async () => {
    getDashboard.mockResolvedValueOnce(SAMPLE_DASHBOARD);

    const { findByText } = render(withQuery(<HomeScreen />));

    expect(await findByText('Ada')).toBeTruthy();
  });
});
