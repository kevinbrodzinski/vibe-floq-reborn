/**
 * Fire a short vibrate on supported mobile devices.
 * Call on 'save', long-press, etc.
 */
export function triggerHaptic(duration = 35, event?: Event) {
  // Only allow vibration on user gestures to avoid Chrome blocking
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator && 
      (!event || event.isTrusted)) {
    navigator.vibrate(duration);
  }
}