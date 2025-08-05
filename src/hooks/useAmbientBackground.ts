import { useEffect } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * Smoothly lerps the page background toward the current moment's colour.
 * Falls back to --colorPrimary when disabled or colour missing.
 */
export function useAmbientBackground(color: string | undefined) {
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReduced) return;                         // respect a11y
    const target = color ?? 'hsl(var(--primary))';

    const root = document.documentElement;
    const previous = getComputedStyle(root)
      .getPropertyValue('--afterglow-bg')
      .trim() || 'hsl(var(--primary))';

    // quick CSS lerp via transition
    root.style.setProperty('--afterglow-bg', previous);
    root.style.transition = 'background 500ms ease';
    requestAnimationFrame(() =>
      root.style.setProperty('--afterglow-bg', target),
    );

    return () => {
      root.style.transition = '';
    };
  }, [color, prefersReduced]);
}