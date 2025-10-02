export function haptic(kind: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  
  const ms = kind === 'heavy' ? 50 : kind === 'medium' ? 25 : 10;
  navigator.vibrate(ms);
}
