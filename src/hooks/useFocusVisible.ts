import { useEffect } from 'react';

/**
 * Adds `.using-keyboard` to <body> whenever the user presses TAB,
 * and removes it on mouse/touch.  Lets you style focus rings
 * only for keyboard users (WCAG 2.1 – Focus Indicators).
 */
export function useFocusVisible() {
  useEffect(() => {
    const onKey   = (e: KeyboardEvent) => e.key === 'Tab' && document.body.classList.add('using-keyboard');
    const onPoint = () => document.body.classList.remove('using-keyboard');

    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPoint);
    window.addEventListener('touchstart', onPoint);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPoint);
      window.removeEventListener('touchstart', onPoint);
    };
  }, []);
}