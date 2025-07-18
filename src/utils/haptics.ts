/**
 * Fire a short vibrate on supported mobile devices.
 * Call on 'save', long-press, etc.
 */
export function triggerHaptic(duration = 35) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(duration);
  }
}