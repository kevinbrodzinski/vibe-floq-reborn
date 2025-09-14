// Lightweight screen-on ratio from document visibility
export class DeviceUsageTracker {
  private lastTick = Date.now();
  private activeMs = 0;
  private lastVisChange = Date.now();

  constructor() {
    if (typeof document !== 'undefined') {
      this.lastVisChange = Date.now();
      document.addEventListener('visibilitychange', this.onVis, { passive: true });
    }
  }

  private onVis = () => {
    const now = Date.now();
    if (typeof document !== 'undefined' && !document.hidden) {
      // nothing — accrue on pullRatio
    }
    this.lastVisChange = now;
  };

  /** 0..1 ratio since last pull; resets the window */
  pullRatio(): number {
    const now = Date.now();
    if (typeof document !== 'undefined' && !document.hidden) {
      this.activeMs += now - this.lastVisChange;
    }
    const dt = Math.max(1, now - this.lastTick);
    const ratio = Math.max(0, Math.min(1, this.activeMs / dt));

    // reset
    this.lastTick = now;
    this.lastVisChange = now;
    this.activeMs = 0;
    return ratio;
  }

  dispose() {
    try { document.removeEventListener('visibilitychange', this.onVis); } catch {}
  }
}