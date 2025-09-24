// Tracks how long the app was visible/active since the last collect()
// SSR-safe. Web only; RN can wire AppState similarly if needed.
export class DeviceUsageTracker {
  private lastTick = Date.now();
  private lastVisChange = Date.now();
  private visible = true;
  private activeMs = 0;

  private onVis = () => {
    const now = Date.now();
    // accrue time from last change
    if (this.visible) this.activeMs += now - this.lastVisChange;
    this.visible = !document.hidden;
    this.lastVisChange = now;
  };

  private onActivity = () => {
    // "activity hints" can be layered later; we rely on visibility for now
  };

  constructor() {
    if (typeof document !== 'undefined') {
      this.visible = !document.hidden;
      this.lastVisChange = Date.now();
      document.addEventListener('visibilitychange', this.onVis, { passive: true });
      window.addEventListener('pointerdown', this.onActivity, { passive: true });
      window.addEventListener('keydown', this.onActivity, { passive: true });
    }
  }

  /** Ratio of foreground visible time since last collect (0..1). Resets window. */
  pullRatio(): number {
    const now = Date.now();
    // accrue current visible streak
    if (this.visible) this.activeMs += now - this.lastVisChange;

    const windowMs = Math.max(1, now - this.lastTick);
    const ratio = Math.max(0, Math.min(1, this.activeMs / windowMs));

    // reset window
    this.lastTick = now;
    this.lastVisChange = now;
    this.activeMs = 0;
    return ratio;
  }

  dispose() {
    try {
      document.removeEventListener('visibilitychange', this.onVis);
      window.removeEventListener('pointerdown', this.onActivity);
      window.removeEventListener('keydown', this.onActivity);
    } catch {}
  }
}