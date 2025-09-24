// Arrived/departing detection + dwell minutes
export class DwellTracker {
  private arrivedAt: number | null = null;
  private lastMoving = Date.now();
  private readonly ARRIVE_SEC = 90;
  private readonly LEAVE_SEC = 120;

  update(moving01: number) {
    const now = Date.now();
    if (moving01 > 0.15) {
      this.lastMoving = now;
      if (this.arrivedAt !== null && now - this.lastMoving > this.LEAVE_SEC * 1000) {
        this.arrivedAt = null; // departed
      }
    } else {
      // still
      if (this.arrivedAt == null) {
        // Arrive if stationary long enough since last move
        if (now - this.lastMoving > this.ARRIVE_SEC * 1000) this.arrivedAt = now;
      }
    }
  }

  arrived() { 
    return this.arrivedAt != null; 
  }

  departing() { 
    return this.arrivedAt == null && Date.now() - this.lastMoving < this.LEAVE_SEC * 1000; 
  }

  dwellMinutes() { 
    if (!this.arrivedAt) return 0;
    const minutes = (Date.now() - this.arrivedAt) / 60000;
    // Treat sub-frame residue as zero to avoid jitter in tests
    return minutes < 1e-6 ? 0 : minutes;
  }
}