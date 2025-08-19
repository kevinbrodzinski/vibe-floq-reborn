# Discovery System - Wave Tap → Venue Lookup → "Let's Floq at {Venue}"

## Overview
Complete discovery system that allows users to find waves, get venue context, and create momentary floqs with proper venue attribution.

## Flow
1. **User taps wave** (map circle or list item)
2. **Wave info sheet** slides up showing size, friends, location
3. **User taps "Continue"** 
4. **Venue lookup sheet** appears with spinner
5. **RPC queries nearest venue** within 200m
6. **CTA updates** to "Let's Floq at {Venue}" or "Let's Floq here"
7. **User taps CTA** → momentary floq created with venue context
8. **Auto-navigation** to momentary floq UI

## Components

### `WaveBottomSheet.tsx`
- Initial wave information display
- Transitions to venue lookup on "Continue"
- Manages state between both sheets

### `NearestVenueSheet.tsx`
- Queries `rpc_nearest_venue` with React Query
- Shows loading state while fetching
- Dynamic CTA based on venue found/not found
- Handles error states gracefully

### `FilterChips.tsx`
- Radius selection (500m to 4km)
- Refresh button for manual updates

### `WaveListItem.tsx` & `RippleListItem.tsx`
- List representations of map data
- Consistent with map interactions

## Database Requirements

### Required RPC
- `rpc_nearest_venue(lat, lng, max_distance_m)` - Returns closest venue
- Works with either `geometry` or `lat`/`lng` columns
- Includes distance calculation and proper indexing

### Required Permissions
- `authenticated` role can `SELECT` from `venues` table
- `authenticated` role can `EXECUTE` the nearest venue RPC

### Required Indexes
- `venues_location_gix` - GIST index on geometry column (if exists)
- `venues_latlng_geog_gix` - GIST index on geography expression (if lat/lng scalars)

## Testing

### Console Tests
```javascript
// Test venue RPC
await window.testVenueLookup.testNearestVenueRPC();

// Test venue-aware floq creation  
await window.testVenueLookup.testVenueAwareFloqCreation();

// Test complete flow
await window.testVenueLookup.testCompleteVenueFlow();
```

### Manual UI Test
1. Navigate to `/discover`
2. Click wave circle on map
3. See wave info sheet → tap "Continue"
4. See venue lookup with spinner
5. See CTA update to venue name
6. Tap CTA → navigate to momentary floq

## Edge Cases Handled
- **No venue found** → "Here looks good" + "Let's Floq here"
- **RLS blocks venues** → Error message + fallback to coordinates
- **Multiple venues** → Returns closest one
- **Invalid coordinates** → Graceful error handling

## Environment
- Requires `VITE_MAPBOX_TOKEN` for web maps
- Uses existing Supabase client singleton
- Compatible with existing venue database schema