// DwellTracker.ts
// Tracks "stillness" time and exposes arrived/departing state with hysteresis.

export class DwellTracker {
  private enterAt: number | null = null;
  private lastMoving: number = Date.now();

  update(moving01: number) {
    const now = Date.now();
    const still = moving01 < 0.2;
    if (still) {
      if (this.enterAt == null) this.enterAt = now;
    } else {
      this.enterAt = null;
      this.lastMoving = now;
    }
  }

  dwellMinutes() {
    return this.enterAt ? (Date.now() - this.enterAt) / 60000 : 0;
  }

  arrived() {
    // Consider "arrived" after 3+ min of stillness
    return this.dwellMinutes() >= 3;
  }

  departing() {
    // Consider "departing" within 2 min of last movement event
    return this.enterAt == null && Date.now() - this.lastMoving < 2 * 60 * 1000;
  }
}