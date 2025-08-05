# V2 Location Stack Implementation Guide

## 🎯 **Hybrid H3/Geohash Strategy for Hosted Supabase**

This guide implements your recommended "v2 location + field" stack that works perfectly with hosted Supabase (no H3 extension required).

---

## 📋 **Migration Order & Execution**

### **1. Run Migrations in Order**
```bash
# First - Core monitoring and field tiles infrastructure
supabase db push supabase/migrations/20250105000000_enhanced_location_rpc_functions_FINAL.sql

# Second - Real-time optimization and hybrid spatial queries
supabase db push supabase/migrations/20250105000001_realtime_location_optimization_FINAL.sql
```

---

## 🏗️ **Architecture Overview**

### **Use Case Mapping**

| **Use Case** | **When** | **Storage** | **Query Method** | **Why This Works** |
|--------------|----------|-------------|------------------|-------------------|
| **Live Presence** | 30s batched upsert | `profile_id`, `lat`, `lng`, `geohash6`, `h3_idx` (optional) | Equality/prefix on geohash6; `.in('h3_idx', kRing(...))` | Geohash cheap to compute; B-tree fast for lookups |
| **Field Tiles** | Server cron/on-demand | PostGIS `ST_HexagonGrid` materialized view | Spatial joins with `ST_Contains(hex.geom, vibe.location)` | ST_HexagonGrid available in Supabase PostGIS ≥3.2 |
| **Neighbor Queries** | Edge Function JIT | Client H3 (`h3-js`) → `kRing()` → `.in('h3_idx', ringArray)` | B-tree index on h3_idx column | Perfect hierarchy; heavy work in Edge, not DB |
| **Analytics** | Batch/warehouse | Raw GPS in PostGIS; H3 via external tools | PostGIS aggregates or external ETL | Doesn't block product features |

---

## 💻 **Frontend Implementation**

### **1. Install H3 Client Library**
```bash
npm install h3-js
```

### **2. Enhanced LocationBus with Hybrid Indexing**

```typescript
// src/lib/location/LocationBus.ts
import { geoToH3, kRing } from 'h3-js';

class LocationBus {
  private processLocationUpdate(coords: GeoCoords): void {
    // Compute H3 index client-side (H3 resolution 8 ≈ 460m hex)
    const h3Idx = geoToH3(coords.lat, coords.lng, 8);
    
    // Enhanced location data with spatial indexes
    const enhancedCoords = {
      ...coords,
      h3_idx: h3Idx,
      // geohash6 will be computed server-side for consistency
    };

    // Distribute to consumers
    this.distributeToConsumers(enhancedCoords);
    
    // Batch for database write
    this.addToBatch(enhancedCoords);
  }

  // Get nearby H3 cells for neighbor queries
  public getH3Neighbors(lat: number, lng: number, ringSize: number = 1): bigint[] {
    const centerH3 = geoToH3(lat, lng, 8);
    const ring = kRing(centerH3, ringSize);
    return ring.map(h3 => BigInt(h3));
  }
}
```

### **3. Enhanced useUnifiedLocation Hook**

```typescript
// src/hooks/location/useUnifiedLocation.ts
import { geoToH3, kRing } from 'h3-js';

export function useUnifiedLocation(options: UnifiedLocationOptions): UnifiedLocationState {
  // ... existing code ...

  // Enhanced location update with H3 indexing
  const handleLocationUpdate = useCallback((coords: GeoCoords) => {
    // Compute H3 index client-side
    const h3Idx = geoToH3(coords.lat, coords.lng, 8);
    
    const enhancedCoords = {
      ...coords,
      h3_idx: h3Idx
    };

    // Update store with enhanced data
    updateLocation(enhancedCoords, Date.now());
    
    // Handle tracking/presence with spatial indexes
    if (enableTracking || enablePresence) {
      handleLocationTracking(enhancedCoords);
    }
  }, [enableTracking, enablePresence, updateLocation]);

  // Get nearby users using H3 kRing
  const getNearbyUsers = useCallback(async (radiusMeters: number = 1000) => {
    if (!coords) return [];

    // Compute H3 ring client-side
    const centerH3 = geoToH3(coords.lat, coords.lng, 8);
    const ringSize = Math.ceil(radiusMeters / 460); // 460m ≈ H3 res 8 edge length
    const h3Ring = kRing(centerH3, ringSize).map(h3 => BigInt(h3));

    // Call optimized RPC function
    const { data } = await supabase.rpc('get_nearby_users_v2', {
      p_lat: coords.lat,
      p_lng: coords.lng,
      p_radius_meters: radiusMeters,
      p_h3_ring_ids: h3Ring
    });

    return data || [];
  }, [coords]);

  return {
    // ... existing returns ...
    getNearbyUsers,
    h3Index: coords ? geoToH3(coords.lat, coords.lng, 8) : null
  };
}
```

### **4. Enhanced Presence Publisher**

```typescript
// src/hooks/location/usePresencePublisher.ts
export function usePresencePublisher() {
  const publishPresence = useCallback(async (coords: GeoCoords, vibe: string) => {
    // Compute H3 index client-side
    const h3Idx = geoToH3(coords.lat, coords.lng, 8);

    // Call V2 presence function with hybrid indexing
    const { data } = await supabase.rpc('upsert_presence_realtime_v2', {
      p_lat: coords.lat,
      p_lng: coords.lng,
      p_vibe: vibe,
      p_h3_idx: h3Idx // Client-computed H3 index
    });

    return data;
  }, []);

  return { publishPresence };
}
```

---

## 🗄️ **Database Schema Enhancements**

### **1. Add Spatial Index Columns (Migration-Safe)**

```sql
-- Add columns to existing tables (if they don't exist)
ALTER TABLE public.vibes_now 
ADD COLUMN IF NOT EXISTS h3_idx BIGINT,
ADD COLUMN IF NOT EXISTS geohash6 TEXT;

ALTER TABLE public.presence 
ADD COLUMN IF NOT EXISTS h3_idx BIGINT,
ADD COLUMN IF NOT EXISTS geohash6 TEXT;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_vibes_now_h3_idx 
  ON public.vibes_now(h3_idx) WHERE h3_idx IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vibes_now_geohash6 
  ON public.vibes_now(geohash6) WHERE geohash6 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presence_h3_idx 
  ON public.presence(h3_idx) WHERE h3_idx IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presence_geohash6 
  ON public.presence(geohash6) WHERE geohash6 IS NOT NULL;
```

### **2. Field Tiles V2 Table (Created by Migration)**

```sql
-- Already created by migration - PostGIS hex grid approach
CREATE TABLE public.field_tiles_v2 (
  tile_id text PRIMARY KEY,
  hex_geom geometry(POLYGON, 4326) NOT NULL,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  crowd_count integer DEFAULT 0,
  avg_vibe jsonb DEFAULT '{}',
  vibe_mix jsonb DEFAULT '{}',
  active_profile_ids uuid[] DEFAULT '{}',
  last_activity timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

---

## 🔧 **Edge Function Integration**

### **1. Enhanced Batch Location Update**

```typescript
// supabase/functions/record-locations/index.ts
import { geoToH3 } from 'h3-js';

export default async function handler(req: Request) {
  const { batch } = await req.json();

  // Enhance batch with client-computed H3 indexes
  const enhancedBatch = batch.map(location => ({
    ...location,
    h3_idx: geoToH3(location.lat, location.lng, 8)
  }));

  // Use V2 batch function with spatial indexing
  const { data } = await supabase.rpc('batch_location_update_v2', {
    p_locations: enhancedBatch,
    p_priority: 'medium'
  });

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### **2. Smart Neighbor Discovery**

```typescript
// supabase/functions/discover-nearby/index.ts
import { geoToH3, kRing } from 'h3-js';

export default async function handler(req: Request) {
  const { lat, lng, radius_meters = 1000 } = await req.json();

  // Compute H3 ring client-side (Edge Function)
  const centerH3 = geoToH3(lat, lng, 8);
  const ringSize = Math.ceil(radius_meters / 460); // H3 res 8 ≈ 460m
  const h3Ring = kRing(centerH3, ringSize);

  // Query with hybrid spatial strategy
  const { data } = await supabase.rpc('get_nearby_users_v2', {
    p_lat: lat,
    p_lng: lng,
    p_radius_meters: radius_meters,
    p_h3_ring_ids: h3Ring.map(h3 => BigInt(h3))
  });

  return new Response(JSON.stringify({
    users: data,
    spatial_method: 'h3_kring',
    ring_size: ringSize,
    total_cells: h3Ring.length
  }));
}
```

---

## 📊 **Field Tiles Implementation**

### **1. Server-Side Hex Grid Generation**

```typescript
// Cron job or on-demand refresh
export default async function refreshFieldTiles(req: Request) {
  const { 
    hex_size_meters = 500,
    bbox_lat_min,
    bbox_lat_max,
    bbox_lng_min,
    bbox_lng_max 
  } = await req.json();

  // Use PostGIS hex grid (no H3 extension required)
  const { data } = await supabase.rpc('refresh_field_tiles_v2', {
    p_hex_size_meters: hex_size_meters,
    p_bbox_lat_min: bbox_lat_min,
    p_bbox_lat_max: bbox_lat_max,
    p_bbox_lng_min: bbox_lng_min,
    p_bbox_lng_max: bbox_lng_max
  });

  return new Response(JSON.stringify({
    success: true,
    processed_tiles: data.processed_tiles,
    spatial_method: 'postgis_hex_grid',
    hex_size_meters
  }));
}
```

### **2. Field Visualization Component**

```typescript
// src/components/field/FieldVisualization.tsx
export function FieldVisualization({ viewport }: FieldVisualizationProps) {
  const [fieldTiles, setFieldTiles] = useState<FieldTile[]>([]);

  const loadFieldTiles = useCallback(async () => {
    const { data } = await supabase.rpc('get_field_tiles_optimized_v2', {
      p_bbox_lat_min: viewport.bounds.south,
      p_bbox_lat_max: viewport.bounds.north,
      p_bbox_lng_min: viewport.bounds.west,
      p_bbox_lng_max: viewport.bounds.east
    });

    setFieldTiles(data || []);
  }, [viewport]);

  return (
    <div className="field-visualization">
      {fieldTiles.map(tile => (
        <HexTile
          key={tile.tile_id}
          geometry={tile.hex_geom}
          crowdCount={tile.crowd_count}
          avgVibe={tile.avg_vibe}
          vibeMix={tile.vibe_mix}
        />
      ))}
    </div>
  );
}
```

---

## 🚀 **Performance Optimizations**

### **1. Query Strategy Hierarchy**

```typescript
// Automatically choose best spatial strategy
export async function getNearbyUsersOptimized(
  lat: number, 
  lng: number, 
  radiusMeters: number
) {
  // Strategy 1: H3 kRing (fastest - O(1) index lookup)
  const h3Ring = kRing(geoToH3(lat, lng, 8), 1);
  
  let { data } = await supabase.rpc('get_nearby_users_v2', {
    p_lat: lat,
    p_lng: lng,
    p_radius_meters: radiusMeters,
    p_h3_ring_ids: h3Ring.map(h3 => BigInt(h3))
  });

  // Strategy 2: Geohash prefix fallback (good performance)
  if (!data?.length) {
    const geohash6 = Geohash.encode(lat, lng, 6);
    const prefix = geohash6.substring(0, 4); // Expand search
    
    ({ data } = await supabase.rpc('get_nearby_users_v2', {
      p_lat: lat,
      p_lng: lng,
      p_radius_meters: radiusMeters,
      p_geohash_prefix: prefix
    }));
  }

  return data || [];
}
```

### **2. Batch Processing with Circuit Breaker**

```typescript
// Smart batching with circuit breaker awareness
export class LocationBatchProcessor {
  async processBatch(locations: GeoCoords[]) {
    // Check circuit breaker state
    const { data: health } = await supabase.rpc('get_location_system_health');
    
    if (health?.circuit_breaker?.current_state === 'OPEN') {
      // Circuit breaker is open, queue for later
      this.queueForRetry(locations);
      return;
    }

    // Enhance with H3 indexes
    const enhancedLocations = locations.map(loc => ({
      ...loc,
      h3_idx: geoToH3(loc.lat, loc.lng, 8)
    }));

    // Process with V2 function
    const { data } = await supabase.rpc('batch_location_update_v2', {
      p_locations: enhancedLocations,
      p_priority: 'medium'
    });

    return data;
  }
}
```

---

## 📈 **Monitoring & Health**

### **1. System Health Dashboard**

```typescript
// src/components/debug/LocationSystemHealthDashboard.tsx
export function LocationSystemHealthDashboard() {
  const [healthData, setHealthData] = useState(null);

  const loadHealthData = useCallback(async () => {
    const { data } = await supabase.rpc('get_location_system_health', {
      p_time_window_minutes: 60
    });
    setHealthData(data);
  }, []);

  return (
    <div className="health-dashboard">
      <div className="spatial-strategy-metrics">
        <h3>V2 Spatial Strategy Performance</h3>
        <div className="metric">
          <label>H3 kRing Queries:</label>
          <span>{healthData?.performance?.h3_queries || 0}</span>
        </div>
        <div className="metric">
          <label>Geohash Prefix Queries:</label>
          <span>{healthData?.performance?.geohash_queries || 0}</span>
        </div>
        <div className="metric">
          <label>PostGIS Fallback Queries:</label>
          <span>{healthData?.performance?.postgis_queries || 0}</span>
        </div>
      </div>
      
      <div className="field-tiles-metrics">
        <h3>Field Tiles V2 (PostGIS Hex Grid)</h3>
        <div className="metric">
          <label>Active Tiles:</label>
          <span>{healthData?.field_tiles?.active_count || 0}</span>
        </div>
        <div className="metric">
          <label>Last Refresh:</label>
          <span>{healthData?.field_tiles?.last_refresh || 'Never'}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ **Verification Checklist**

### **Post-Migration Verification**

```sql
-- 1. Verify tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('field_tiles_v2', 'location_system_health', 'location_performance_metrics');

-- 2. Test V2 functions
SELECT public.get_location_system_health(60);
SELECT public.refresh_field_tiles_v2(500.0, NULL, NULL, NULL, NULL);

-- 3. Verify spatial indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('vibes_now', 'presence') 
AND indexname LIKE '%h3_idx%' OR indexname LIKE '%geohash%';

-- 4. Test hybrid spatial query
SELECT public.get_nearby_users_v2(
  34.0522, -118.2437, 1000.0, -- LA coordinates
  ARRAY[BigInt('8c2a1072b2b7fff')]::BIGINT[], -- Sample H3 ring
  NULL, 50
);
```

### **Performance Benchmarks**

```typescript
// Performance testing
export async function benchmarkSpatialStrategies() {
  const testCoords = { lat: 34.0522, lng: -118.2437 }; // LA
  
  // Test H3 kRing strategy
  const h3Start = performance.now();
  const h3Ring = kRing(geoToH3(testCoords.lat, testCoords.lng, 8), 1);
  const h3Results = await supabase.rpc('get_nearby_users_v2', {
    p_lat: testCoords.lat,
    p_lng: testCoords.lng,
    p_radius_meters: 1000,
    p_h3_ring_ids: h3Ring.map(h3 => BigInt(h3))
  });
  const h3Time = performance.now() - h3Start;

  // Test geohash strategy
  const geohashStart = performance.now();
  const geohashResults = await supabase.rpc('get_nearby_users_v2', {
    p_lat: testCoords.lat,
    p_lng: testCoords.lng,
    p_radius_meters: 1000,
    p_geohash_prefix: 'dr5r' // LA area prefix
  });
  const geohashTime = performance.now() - geohashStart;

  console.log({
    h3_strategy: { time_ms: h3Time, results: h3Results.data?.length },
    geohash_strategy: { time_ms: geohashTime, results: geohashResults.data?.length }
  });
}
```

---

## 🎯 **Key Benefits Achieved**

### ✅ **Hosted Supabase Compatible**
- No H3 extension required
- Uses built-in PostGIS ST_HexagonGrid
- Standard B-tree indexes on varchar/bigint

### ✅ **Performance Optimized**
- Client-side H3 computation (Edge Functions)
- Hierarchical query strategies (H3 → geohash → PostGIS)
- Smart batching with circuit breaker protection

### ✅ **Type Safe**
- H3 indexes as `bigint` columns
- Geohash as `text` columns  
- Generated TypeScript types from schema

### ✅ **Scalable Architecture**
- Heavy spatial work in Edge Functions
- Lightweight database operations
- Efficient spatial indexing without extensions

This V2 implementation gives you **everything you need** for real-time location features while staying **100% compatible** with hosted Supabase! 🚀