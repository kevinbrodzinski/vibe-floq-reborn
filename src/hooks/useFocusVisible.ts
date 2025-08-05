import { useEffect } from 'react';

/**
 * Adds `.using-keyboard` to <body> whenever the user presses TAB,
 * and removes it on mouse/touch.  Lets you style focus rings
 * only for keyboard users (WCAG 2.1 – Focus Indicators).
 */
export function useFocusVisible() {
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard
    
    const onKey = (e: KeyboardEvent) => e.key === 'Tab' && document.body.classList.add('using-keyboard');
    const onPointer = () => document.body.classList.remove('using-keyboard');

    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, []);
}