/**
 * Token shape + theming sanity. Both maps MUST expose the same keys —
 * any drift breaks runtime `useTokens()` consumers in dark mode.
 */
import { tokensLight, tokensDark, useTokens } from './tokens';
import { renderHook } from '@testing-library/react-native';

// Mock useColorScheme so we can flip themes deterministically.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => {
  return { default: jest.fn() };
});
// eslint-disable-next-line @typescript-eslint/no-require-imports
const useColorScheme = require('react-native/Libraries/Utilities/useColorScheme').default;

describe('token maps', () => {
  it('expose identical key sets across light + dark', () => {
    const lightKeys = Object.keys(tokensLight).sort();
    const darkKeys = Object.keys(tokensDark).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  it('locks the hive-gold accent on dark mode', () => {
    expect(tokensDark.accent).toBe('#F8E71C');
  });

  it('keeps the yellow canvas in light mode (bg = highlight gold)', () => {
    expect(tokensLight.bg).toBe('#F8E71C');
  });

  it('uses black accent in light mode for CTAs', () => {
    expect(tokensLight.accent).toBe('#0A0A0A');
  });
});

describe('useTokens()', () => {
  afterEach(() => useColorScheme.mockReset());

  it('returns the dark map when colorScheme is dark', () => {
    useColorScheme.mockReturnValue('dark');
    const { result } = renderHook(() => useTokens());
    expect(result.current.bg).toBe(tokensDark.bg);
    expect(result.current.accent).toBe('#F8E71C');
  });

  it('returns the light map when colorScheme is light', () => {
    useColorScheme.mockReturnValue('light');
    const { result } = renderHook(() => useTokens());
    expect(result.current.bg).toBe(tokensLight.bg);
  });

  it('falls back to the light map when colorScheme is null', () => {
    useColorScheme.mockReturnValue(null);
    const { result } = renderHook(() => useTokens());
    expect(result.current.bg).toBe(tokensLight.bg);
  });
});
