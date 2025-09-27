# FLOQ Observability

## PIXI Performance Metrics

The FLOQ app includes comprehensive observability for PIXI systems to monitor performance and catch issues early.

### Key Metrics

- **pixi_draw_count**: Total number of draw cycles
- **pixi_draw_avg_ms**: Average draw time (target: <16.67ms for 60fps)
- **pixi_queue_depth_peak**: Maximum message queue depth
- **pixi_timecrystal_ready_total**: TimeCrystal ready state transitions
- **pixi_filter_normalized_total**: Map filter normalizations applied
- **pixi_context_lost_total**: WebGL context loss events
- **pixi_reinit_total**: PIXI system reinitializations

### Usage

```typescript
import { getPixiMetrics, recordPixiDraw } from '@/lib/observability/pixiMetrics';

// Record a draw cycle
const start = performance.now();
// ... rendering code ...
recordPixiDraw(performance.now() - start);

// Get current metrics
const metrics = getPixiMetrics();
console.log('Average draw time:', metrics.pixi_draw_avg_ms, 'ms');
```

### Performance Thresholds

- **Draw time**: >16.67ms indicates performance issues
- **Queue depth**: >10 suggests event throttling needed
- **Context loss**: Should be rare in normal operation

### Debugging Slow Performance

1. Check `pixi_draw_avg_ms` - if >16.67ms, investigate bottlenecks
2. Monitor `pixi_queue_depth_peak` - high values indicate event flooding
3. Watch for `pixi_context_lost_total` spikes during development

### Production Monitoring

In production builds, metrics are collected but debug logs are suppressed. Access metrics via:

```typescript
// In browser console or monitoring dashboard
window.__floq_metrics = getPixiMetrics();
```