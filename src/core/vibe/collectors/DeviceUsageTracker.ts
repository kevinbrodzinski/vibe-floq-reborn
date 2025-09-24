// Tracks how long the app was visible/active since the last collect()
// SSR-safe. Web only; RN can wire AppState similarly if needed.
export class DeviceUsageTracker {
  private lastTick = Date.now();
  private activeMs = 0;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        // pause/resume implicitly handled by next ratio call
      }, { passive: true });
    }
  }

  ratioSinceLastTick() {
    const now = Date.now();
    const dt = Math.max(1, now - this.lastTick);
    const wasActive = typeof document === 'undefined' ? true : !document.hidden;

    this.activeMs += wasActive ? dt : 0;

    // compute ratio, then reset window
    const ratio = Math.max(0, Math.min(1, this.activeMs / dt));
    this.lastTick = now;
    this.activeMs = 0;
    return ratio;
  }
}