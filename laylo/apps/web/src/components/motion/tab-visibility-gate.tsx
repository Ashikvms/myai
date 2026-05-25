'use client';

/**
 * TabVisibilityGate — LIVE_ANIMATION_PLAN.md §3 + §4.
 *
 * Context provider hooked to `document.visibilitychange`. Exposes a
 * `useTabVisible()` hook that returns `true` while the tab is visible and
 * `false` once it's hidden. All ambient animation primitives consume this
 * to pause when the tab is in the background — saves battery + CPU.
 *
 * Default (SSR / no document) is `true` so animations render on first paint.
 */
import * as React from 'react';

const TabVisibilityCtx = React.createContext<boolean>(true);

export function TabVisibilityGate({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = React.useState<boolean>(() => {
    if (typeof document === 'undefined') return true;
    return !document.hidden;
  });

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    // Sync once in case state drifted between SSR + mount.
    setVisible(!document.hidden);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return (
    <TabVisibilityCtx.Provider value={visible}>
      {children}
    </TabVisibilityCtx.Provider>
  );
}

/** Returns true while the tab/window is visible. Defaults to true. */
export function useTabVisible(): boolean {
  return React.useContext(TabVisibilityCtx);
}
