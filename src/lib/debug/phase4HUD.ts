// Phase 4 HUD counters for canary monitoring
export function logPhase4Metrics(counters: {
  fps: number;
  flowArrows: number;
  pressureCells: number;
  windsPaths: number;
  auroraActive: number;
  workerMs?: number;
  drawCalls?: number;
}) {
  if (import.meta.env.DEV) {
    console.info('[Phase4 HUD]', {
      fps: Math.round(counters.fps),
      flow_arrows: counters.flowArrows,
      pressure_cells: counters.pressureCells,
      winds_paths: counters.windsPaths,
      aurora_active: counters.auroraActive,
      worker_ms: counters.workerMs ? Math.round(counters.workerMs * 100) / 100 : undefined,
      draw_calls: counters.drawCalls
    });
  }
}

// Boot log helper
export function logPhase4Boot() {
  if (import.meta.env.DEV) {
    console.info('[Phase4] Boot complete', {
      worker: 'web-worker', // Will be dynamic when fallback detection is added
      timestamp: new Date().toISOString()
    });
  }
}