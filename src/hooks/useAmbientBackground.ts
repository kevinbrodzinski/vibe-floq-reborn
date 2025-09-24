import { useEffect } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * Smoothly lerps the page background toward the current moment's colour.
 * Falls back to --background when disabled or colour missing.
 */
export function useAmbientBackground(color?: string) {
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReduced) return;                         // respect a11y
    const target = color ?? 'hsl(var(--background))';

    const root = document.documentElement;
    const prev = getComputedStyle(root).getPropertyValue('--afterglow-bg').trim() || target;
    root.style.setProperty('--afterglow-bg', prev);
    root.style.transition = 'background 400ms ease';
    requestAnimationFrame(() => root.style.setProperty('--afterglow-bg', target));

    return () => {
      // reset to neutral when page unmounts
      root.style.setProperty('--afterglow-bg', 'hsl(var(--background))');
      root.style.transition = '';
    };
  }, [color, prefersReduced]);
}