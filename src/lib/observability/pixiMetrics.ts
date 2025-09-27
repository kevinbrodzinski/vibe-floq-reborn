/**
 * PIXI observability metrics for performance monitoring and debugging
 */

// Performance metrics
let pixiDrawCount = 0
let pixiDrawTotalMs = 0
let pixiQueueDepthPeak = 0

// Lifecycle metrics  
let pixiTimecrystalReadyCount = 0
let pixiFilterNormalizedCount = 0

// Context metrics
let pixiContextLostCount = 0
let pixiReinitCount = 0

/**
 * Record a PIXI draw cycle timing
 */
export function recordPixiDraw(durationMs: number): void {
  pixiDrawCount++
  pixiDrawTotalMs += durationMs
  
  if (process.env.NODE_ENV !== 'production') {
    // Log slow draws
    if (durationMs > 16.67) { // >60fps threshold
      console.debug(`[PixiMetrics] Slow draw: ${durationMs.toFixed(2)}ms`);
    }
  }
}

/**
 * Record TimeCrystal ready state
 */
export function recordTimecrystalReady(): void {
  pixiTimecrystalReadyCount++
  
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[PixiMetrics] TimeCrystal ready', { total: pixiTimecrystalReadyCount });
  }
}

/**
 * Record queue depth when draining messages
 */
export function recordQueueDepth(depth: number): void {
  if (depth > pixiQueueDepthPeak) {
    pixiQueueDepthPeak = depth
  }
  
  if (process.env.NODE_ENV !== 'production' && depth > 10) {
    console.debug('[PixiMetrics] High queue depth:', depth);
  }
}

/**
 * Record filter normalization for observability
 */
export function recordFilterNormalized(): void {
  pixiFilterNormalizedCount++
}

/**
 * Record WebGL context events
 */
export function recordContextLost(): void {
  pixiContextLostCount++
}

export function recordContextReinit(): void {
  pixiReinitCount++
}

/**
 * Get current metrics snapshot
 */
export function getPixiMetrics() {
  return {
    // Performance
    pixi_draw_count: pixiDrawCount,
    pixi_draw_avg_ms: pixiDrawCount > 0 ? pixiDrawTotalMs / pixiDrawCount : 0,
    pixi_queue_depth_peak: pixiQueueDepthPeak,
    
    // Lifecycle
    pixi_timecrystal_ready_total: pixiTimecrystalReadyCount,
    pixi_filter_normalized_total: pixiFilterNormalizedCount,
    
    // Context
    pixi_context_lost_total: pixiContextLostCount,
    pixi_reinit_total: pixiReinitCount,
  }
}

/**
 * Reset metrics (useful for testing)
 */
export function resetPixiMetrics(): void {
  pixiDrawCount = 0
  pixiDrawTotalMs = 0
  pixiQueueDepthPeak = 0
  pixiTimecrystalReadyCount = 0
  pixiFilterNormalizedCount = 0
  pixiContextLostCount = 0
  pixiReinitCount = 0
}