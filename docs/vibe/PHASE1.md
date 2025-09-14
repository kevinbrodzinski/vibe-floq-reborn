# Vibe Phase 1 MVP - Developer Guide

## Overview
The Vibe Engine provides real-time, on-device mood detection that updates every 60 seconds and feeds your app's color gradients automatically.

## How to Use

### Reading Current Vibe
```typescript
import { useVibeEngine } from "@/hooks/useVibeEngine";

const MyComponent = () => {
  const engine = useVibeEngine();
  
  if (engine) {
    console.log("Current vibe:", engine.currentVibe);
    console.log("Confidence:", engine.confidence);
    console.log("Is detecting:", engine.isDetecting);
  }
};
```

### Coloring UI Elements
```typescript
import { vibeToHex } from "@/lib/vibes";

// Get current vibe color
const vibeColor = vibeToHex(engine.currentVibe);

// Or use CSS variables (automatically updated)
.my-element {
  color: var(--vibe-hex);
  opacity: var(--vibe-alpha); /* confidence-based */
}
```

### CSS Variables
The engine automatically updates these CSS variables:
- `--vibe-hex`: Current vibe color
- `--vibe-alpha`: Confidence-based opacity (0.5-1.0)

## Feature Flags

### Required
```bash
# .env.local
VITE_VIBE_DETECTION=on  # Enables production engine
```

### Optional
```bash
VITE_VIBE_DEBUG=true    # Shows debug panel
```

## Debug Tools

### Dev Console Commands
```javascript
floq.vibeNow()                    // Current reading
floq.vibeTest(1.4, 25)           // Test with movement/dwell
```

### Debug Panel
```typescript
// Temporarily enable in FieldLayout.tsx
<VibeDebugPanel open={true} />
```

## Performance Targets

### Acceptance Gates
- **p95 evaluate() ≤ 80ms** on mid-range device
- No noticeable battery drain during 30-min session
- TypeScript compilation clean: `npm run typecheck`

### Monitoring
```typescript
// Dev-only performance warnings
if (import.meta.env.DEV && reading.calcMs > 80) {
  console.warn('[vibe] slow step', reading.calcMs);
}
```

## Architecture

### Engine Components
1. **Circadian**: Time-of-day patterns
2. **Movement**: Speed and motion detection
3. **VenueEnergy**: Location-based energy
4. **DeviceUsage**: Screen interaction patterns
5. **Weather**: Daylight and temperature

### Data Flow
```
SignalCollector → EngineInputs → MasterEquation → VibeReading → UI
```

### Privacy
- All processing happens on-device
- No network requests in Phase 1
- No PII leaves the device
- Snapshots stored locally only

## Testing

### Unit Tests
```bash
npm run test                     # Includes vibe.engine.basic.test.ts
```

### Manual QA
1. Enable debug panel
2. Check console for `floq.vibeNow()` output
3. Verify gradients change over time
4. Test with reduced motion settings

## Troubleshooting

### Common Issues
- **No vibe updates**: Check `VITE_VIBE_DETECTION=on` in .env.local
- **Performance issues**: Monitor calcMs in debug panel
- **Color not updating**: Verify CSS variables are used, not hardcoded colors

### ESLint Rules
- Prevents `getVibeColor()` regressions
- Enforces use of design system tokens

## Phase 2 Preview
Coming soon: Real GPS movement, venue dwell tracking, weather integration, confidence UI effects, and user feedback loops.