// Arrived/departing detection + dwell minutes
export class DwellTracker {
  private arrivedAt: number | null = null;
  private lastMoving = 0;
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
    return this.arrivedAt ? (Date.now() - this.arrivedAt) / 60000 : 0; 
  }
}