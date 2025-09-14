export type SignalSnapshot = {
  movement?: { speedMps?: number } | null;
  device?: { screenOnRatio01?: number } | null;
  venue?: { type?: string | null } | null;
};

export class AdaptiveScheduler {
  private timer: number | undefined;
  private current = 60_000;

  getInterval(s: SignalSnapshot): number {
    const speed = s.movement?.speedMps ?? 0;
    const screen = s.device?.screenOnRatio01 ?? 0;
    const venueType = s.venue?.type ?? null;

    // Stationary + not engaged → back off
    if (speed < 0.3 && screen < 0.1) return 5 * 60_000;

    // High-energy venues poll a bit faster
    if (venueType === 'nightclub' || venueType === 'gym') return 30_000;

    // Walking/active
    if (speed >= 0.3 && speed < 3) return 60_000;

    // Vehicle speed
    if (speed >= 3) return 120_000;

    return 60_000;
  }

  schedule(next: () => void, sig: SignalSnapshot) {
    if (this.timer) clearTimeout(this.timer);
    const ms = this.getInterval(sig);
    this.current = ms;
    this.timer = window.setTimeout(next, ms);
  }

  cancel() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  getCurrentInterval() {
    return this.current;
  }
}