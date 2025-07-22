# Field Documentation

For detailed information about the Field projection system and how to work with geographic coordinates in the field view, see:

- [Field Projection System](./FIELD_PROJECTION.md) - Geographic coordinate projection and mapping

## Quick Reference

### Projecting Coordinates

```typescript
import { projectLatLng, geohashToCenter } from '@/lib/geo';

// Convert geohash to screen coordinates
const { lng, lat } = geohashToCenter(tileId);
const { x, y } = projectLatLng(lng, lat);
```

### Map Integration

The projection system automatically integrates with the Mapbox instance once the map loads. No manual setup required.