# Field Projection System

## Overview

The Field projection system ensures perfect alignment between PIXI.js auras and Mapbox coordinates at all zoom levels and map tilts. This system replaced the approximate viewport-based calculations with precise Mapbox GL projection APIs.

## Geo Projection

Use `projectLatLng(lng, lat)` and `unprojectXY(x,y)` from `@/lib/geo/project`. They depend on Mapbox GL's internal Mercator transform and stay accurate at every zoom; do **not** derive screen coords from viewport math.

### Basic Usage

```typescript
import { projectLatLng, unprojectXY, setMapInstance } from '@/lib/geo/project';

// Initialize with map instance (done automatically in WebMap)
setMapInstance(map);

// Convert lat/lng to screen coordinates
const { x, y } = projectLatLng(-118.2437, 34.0522);

// Convert screen coordinates back to lat/lng
const { lng, lat } = unprojectXY(500, 300);
```

### Implementation Details

1. **Map Instance Injection**: The WebMap component automatically injects the Mapbox instance via `setMapInstance()`
2. **Precise Projection**: Uses Mapbox GL's internal projection calculations for pixel-perfect accuracy
3. **Error Handling**: Throws descriptive errors if projection is attempted before map initialization

### Performance

- Projection operations are highly optimized by Mapbox GL
- No performance penalty compared to manual calculations
- Eliminates drift and misalignment issues

### Testing

Run `pnpm test:unit` to verify projection accuracy within 1px at zoom level 16.

## Migration from Legacy System

The old `tileIdToScreenCoords()` function has been removed. Update your code:

```typescript
// OLD (removed)
const { x, y } = tileIdToScreenCoords(tileId, viewport, screenSize);

// NEW (Phase 3+)
const { lng, lat } = geohashToCenter(tileId);
const { x, y } = projectLatLng(lng, lat);
```

This ensures auras stick exactly to geographic locations regardless of zoom level or map orientation.