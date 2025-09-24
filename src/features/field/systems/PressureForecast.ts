/**
 * PressureForecast
 * - Derives short-horizon pressure keyframes from current pressure field.
 * - Simple advection by average flow + isotropic diffusion.
 * - Produces 6 keyframes (every 10 min) for Status header & replay.
 *
 * Inputs are pixel-space fields to match existing overlays (fast & unit-consistent).
 */

export type PressureCell = { x: number; y: number; p: number; gx: number; gy: number };
export type FlowCell     = { x: number; y: number; vx: number; vy: number };
export type PressureFrame = { t: number; cells: PressureCell[] };

export interface ForecastOpts {
  horizonMinutes?: number;  // default 60
  stepMinutes?: number;     // default 10  (6 frames)
  diffusion?: number;       // 0..1 (small), default 0.08
  sampleCap?: number;       // max cells used per step, default 900
}

export class PressureForecast {
  private opts: Required<ForecastOpts>;

  constructor(opts?: ForecastOpts) {
    this.opts = {
      horizonMinutes: opts?.horizonMinutes ?? 60,
      stepMinutes:    opts?.stepMinutes    ?? 10,
      diffusion:      opts?.diffusion      ?? 0.08,
      sampleCap:      opts?.sampleCap      ?? 900,
    };
  }

  /**
   * Produce N keyframes from current pressure & flow.
   * Returns frames at now + step*k (k=1..N).
   */
  forecast(nowMs: number, pressure: PressureCell[], flows: FlowCell[]): PressureFrame[] {
    if (!pressure.length) return [];

    // Downsample if needed to bound cost
    const base = pressure.slice(0, this.opts.sampleCap).map(c => ({ ...c }));
    const frames: PressureFrame[] = [];
    const steps = Math.max(1, Math.floor(this.opts.horizonMinutes / this.opts.stepMinutes));

    const avgFlow = this.averageFlow(flows);

    let field = base;
    for (let k = 1; k <= steps; k++) {
      field = this.step(field, avgFlow);
      frames.push({ t: nowMs + k * this.opts.stepMinutes * 60_000, cells: field.map(c => ({ ...c })) });
    }
    return frames;
  }

  private averageFlow(flows: FlowCell[]): { vx: number; vy: number } {
    if (!flows.length) return { vx: 0, vy: 0 };
    const n = Math.min(flows.length, 512);
    let sx = 0, sy = 0;
    for (let i = 0; i < n; i++) {
      sx += flows[i].vx;
      sy += flows[i].vy;
    }
    return { vx: sx / n, vy: sy / n };
  }

  // One forecast step: advect + diffuse + recompute simple gradient
  private step(cells: PressureCell[], flow: { vx: number; vy: number }): PressureCell[] {
    const dt = this.opts.stepMinutes * 60; // seconds
    const advX = flow.vx * dt * 0.1;       // scale to pixel grid
    const advY = flow.vy * dt * 0.1;

    // Advection: shift the sample position by avg flow
    const advected = cells.map(c => ({ ...c, x: c.x + advX, y: c.y + advY }));

    // Diffusion: isotropic blur toward neighborhood mean
    const k = this.opts.diffusion;
    const n = Math.min(advected.length, 800);
    for (let i = 0; i < advected.length; i++) {
      let acc = 0, count = 0;
      // crude neighbor sampling (budgeted)
      for (let j = 0; j < n; j++) {
        const d2 = (advected[i].x - advected[j].x) ** 2 + (advected[i].y - advected[j].y) ** 2;
        if (d2 < 200 ** 2) { acc += advected[j].p; count++; }
      }
      if (count > 0) advected[i].p = advected[i].p * (1 - k) + (acc / count) * k;
    }

    // Simple gradient for visualization (central-diff approx)
    // For speed, use a small local neighborhood
    const r = 64;
    for (let i = 0; i < advected.length; i++) {
      let gx = 0, gy = 0, w = 0;
      const ci = advected[i];
      for (let j = 0; j < n; j++) {
        const cj = advected[j];
        const dx = cj.x - ci.x, dy = cj.y - ci.y;
        const d2 = dx*dx + dy*dy;
        if (d2 > 1 && d2 < r*r) {
          const inv = 1 / d2;
          const dp  = (cj.p - ci.p);
          gx += dp * dx * inv; gy += dp * dy * inv; w += inv;
        }
      }
      if (w > 0) { ci.gx = gx / w; ci.gy = gy / w; }
    }
    return advected;
  }
}