'use client';

import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';

export function useThemeTransition() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = useCallback(
    (e: React.MouseEvent) => {
      const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

      // Get click coordinates for the circle origin
      const x = e.clientX;
      const y = e.clientY;

      // Create overlay with the NEXT theme's background
      const overlay = document.createElement('div');
      overlay.className = 'theme-transition-overlay';
      overlay.style.setProperty('--tx', `${x}px`);
      overlay.style.setProperty('--ty', `${y}px`);
      overlay.style.backgroundColor = nextTheme === 'dark' ? '#0F0F0F' : '#FAFAFA';
      document.body.appendChild(overlay);

      // Switch theme at ~40% through the animation so the reveal covers the flash
      setTimeout(() => {
        setTheme(nextTheme);
      }, 240);

      // Remove overlay after animation completes
      setTimeout(() => {
        overlay.remove();
      }, 650);
    },
    [resolvedTheme, setTheme],
  );

  return { theme: resolvedTheme, mounted, toggleTheme, isDark: resolvedTheme === 'dark' };
}
