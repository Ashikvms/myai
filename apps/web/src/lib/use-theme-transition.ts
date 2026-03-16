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

      // Use a gradient that blends between old and new theme
      if (nextTheme === 'dark') {
        overlay.style.background =
          'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(15,15,15,0.98) 40%, #0F0F0F 100%)';
      } else {
        overlay.style.background =
          'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(250,250,250,0.98) 40%, #FAFAFA 100%)';
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
