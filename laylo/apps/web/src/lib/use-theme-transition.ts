'use client';

import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';

export function useThemeTransition() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = useCallback(
    (e: React.MouseEvent) => {
      const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

      // Create a full-screen gradient overlay that fades in, covers the switch, then fades out
      const overlay = document.createElement('div');
      overlay.className = 'theme-fade-overlay';

      // Gold-on-black radial wash blends between themes (Brief §5.9 / DS §6 #9).
      if (nextTheme === 'dark') {
        overlay.style.background =
          'radial-gradient(circle at center, rgba(255,215,0,0.18) 0%, rgba(0,0,0,0.98) 60%, #000000 100%)';
      } else {
        overlay.style.background =
          'radial-gradient(circle at center, rgba(255,215,0,0.22) 0%, rgba(255,255,255,0.98) 60%, #FFFFFF 100%)';
      }

      document.body.appendChild(overlay);

      // Switch the actual theme at peak opacity (40% of 700ms = 280ms)
      setTimeout(() => {
        setTheme(nextTheme);
      }, 280);

      // Remove overlay after animation finishes
      setTimeout(() => {
        overlay.remove();
      }, 750);
    },
    [resolvedTheme, setTheme],
  );

  return {
    theme: resolvedTheme,
    mounted,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
}
