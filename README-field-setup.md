# Field View Setup

## Phase 1: Mapbox Integration Complete ✅

The Field view now has Mapbox integrated as the base map layer underneath the WebGL field visualization.

### What's Been Implemented

1. **Dependencies**: Added `@rnmapbox/maps` and configured `mapbox-gl`
2. **Cross-platform Map Components**: 
   - `BaseMap` - Platform selector (currently uses WebMap)
   - `WebMap` - Mapbox GL JS implementation for web
   - `NativeMap` - Placeholder for future mobile support
3. **Configuration**: 
   - `app.config.ts` - Expo config with Mapbox plugin
   - `.env.sample` - Template for environment variables
4. **Integration**: Updated `FieldMapLayer` to render Mapbox as base with `FieldCanvas` overlay
5. **Testing**: Added Jest mocks for `mapbox-gl` to prevent test failures

### Mapbox Token Setup

You'll need to configure your Mapbox access token:

1. Go to https://mapbox.com/ and create an account
2. Get your public access token from the Tokens section  
3. Add it using the Supabase secrets management (button should appear in chat)

### How It Works

The Field view now has this layer structure:
```
┌─ BaseMap (Mapbox GL)     ← Base geographic map
├─ FieldCanvas (WebGL)     ← Field aura/cluster overlay  
├─ UI Layer               ← Controls, buttons, modals
└─ System Layer           ← FAB, notifications
```

When users pan/zoom the map, the `onRegionChange` callback will trigger field tile updates for the new viewport bounds.

### Next Steps (Phase 2)

- Add field tiles population cron job in Supabase
- Implement viewport → geohash tile coordinate system bridge  
- Connect map bounds to `useFieldTiles` hook for real-time updates
- Add interaction sync between map and field layers

### Testing Locally

1. Enable Field View in Settings → Experimental → Field View (Beta)
2. Navigate to Field view to see Mapbox map with placeholder field overlay
3. Pan/zoom to see console logs of region changes (ready for tile updates)