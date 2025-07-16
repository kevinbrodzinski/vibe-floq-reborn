import { useEffect, useState } from 'react';

export const usePrefersReducedMotion = () => {
  // SSR-safe guard
  if (typeof window === 'undefined') return true;

  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    // Fallback for Safari < 14
    const handleChange = (e: Event | MediaQueryListEvent) => {
      setPrefersReduced((e as MediaQueryListEvent).matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      (mediaQuery as any).addListener(handleChange);
      return () => (mediaQuery as any).removeListener(handleChange);
    }
  }, []);

  return prefersReduced;
};