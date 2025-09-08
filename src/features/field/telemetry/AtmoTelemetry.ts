/**
 * Atmospheric telemetry for performance monitoring (dev-only, low-sample)
 */

type TelemetryData = {
  cascade_hotspots: number;
  status_type: 'storm_front' | 'high_pressure' | 'low_pressure' | 'clearing';
  frame_spent_ms: number;
};

class AtmoTelemetry {
  private samples: TelemetryData[] = [];
  private lastLog = 0;
  private sampleRate = 0.01; // 1% sample rate

  log(data: Partial<TelemetryData>) {
    if (!import.meta.env.DEV) return;
    if (Math.random() > this.sampleRate) return;

    this.samples.push({
      cascade_hotspots: data.cascade_hotspots ?? 0,
      status_type: data.status_type ?? 'clearing',
      frame_spent_ms: data.frame_spent_ms ?? 0,
    });

    // Flush every minute
    const now = performance.now();
    if (now - this.lastLog > 60_000) {
      this.flush();
      this.lastLog = now;
    }
  }

  private flush() {
    if (this.samples.length === 0) return;

    const cascadeHotspots = this.samples.map(s => s.cascade_hotspots);
    const frameSpentMs = this.samples.map(s => s.frame_spent_ms);
    const statusTypes = this.samples.reduce((acc, s) => {
      acc[s.status_type] = (acc[s.status_type] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('[AtmoTelemetry]', {
      samples: this.samples.length,
      cascade_hotspots_per_min: cascadeHotspots.reduce((a, b) => a + b, 0),
      frame_spent_p50: this.percentile(frameSpentMs, 50),
      frame_spent_p95: this.percentile(frameSpentMs, 95),
      status_distribution: statusTypes,
    });

    this.samples.length = 0;
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[idx] ?? 0;
  }
}

export const atmoTelemetry = new AtmoTelemetry();