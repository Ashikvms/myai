/* eslint-env jest */
/**
 * Test bootstrap — mocks the Expo / RN native modules that crash in
 * a pure-JS Jest environment. Loaded by `setupFiles` so it runs
 * BEFORE the test framework reaches into any `require`.
 *
 * Keep this file tiny. Per-test mocks belong in the test file itself.
 */

// expo-secure-store — in-memory shim so api.ts token round-trips work.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
    __reset: () => store.clear(),
  };
});

// expo-font — pretend fonts are always loaded.
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  loadAsync: jest.fn(async () => undefined),
  isLoaded: jest.fn(() => true),
}));

// expo-router — we mock useRouter / Link / Stack / Tabs surfaces
// that screens import. Tests that need to assert navigation should
// re-mock and capture calls themselves.
jest.mock('expo-router', () => {
  const React = require('react');
  const routerMock = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  };
  return {
    __routerMock: routerMock,
    useRouter: () => routerMock,
    useLocalSearchParams: () => ({}),
    usePathname: () => '/',
    Link: ({ children }) => React.createElement(React.Fragment, null, children),
    Stack: { Screen: () => null },
    Tabs: Object.assign(
      ({ children }) => React.createElement(React.Fragment, null, children),
      { Screen: () => null },
    ),
    Slot: ({ children }) => React.createElement(React.Fragment, null, children),
    Redirect: () => null,
  };
});

// react-native-reanimated — official mock + the hooks the lib still
// ships from its real index that the mock forgets to export. We layer
// our extras on top so callers like `useReducedMotion` and
// `useAnimatedReaction` (used in `motion/animated-number.tsx`) work.
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line global-require
  const Reanimated = require('react-native-reanimated/mock');
  const noop = () => undefined;
  return {
    ...Reanimated,
    useReducedMotion: () => false,
    useAnimatedReaction: noop,
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    Easing: Reanimated.Easing ?? { out: () => noop, cubic: noop },
  };
});

// Silence the warning Reanimated logs when its mock loads.
// eslint-disable-next-line no-undef
global.__reanimatedWorkletInit = jest.fn();
