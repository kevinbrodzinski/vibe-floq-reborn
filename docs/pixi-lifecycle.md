# PIXI Lifecycle Management

## Overview

PIXI systems in FLOQ follow a strict lifecycle to prevent race conditions and ensure proper cleanup.

## Core Pattern

### 1. Lifecycle States
- `ready: boolean` - System is attached and can process messages
- `pending: Event[]` - Queue for messages received before attachment

### 2. Attachment Flow
```ts
onAdd(stage: PIXI.Container, map: mapboxgl.Map) {
  this.stage = stage;
  this.map = map;
  this.ready = true;
  
  // Process queued messages
  for (const event of this.pending) {
    this.processMessage(event.type, event.payload);
  }
  this.pending = [];
}
```

### 3. Message Handling
```ts
onMessage(type: string, payload: any) {
  if (!this.ready) {
    this.pending.push({ type, payload });
    return;
  }
  this.processMessage(type, payload);
}
```

### 4. Rendering Guards
```ts
onFrame(dt: number, project: Function, zoom: number) {
  if (!this.ready || !this.stage) return;
  // ... render logic ...
}

private build(data: any) {
  if (!this.stage) return [];
  // ... build logic ...
}
```

### 5. Cleanup
```ts
onRemove() {
  this.ready = false;
  this.pending = [];
  // ... cleanup resources ...
}
```

## UI Integration

### Emit Gating
UI components should only emit when the PIXI layer is ready:

```ts
const { layerReady } = usePixiLayerStatus();

useEffect(() => {
  if (!layerReady) return;
  bridge.emit({ type: 'temporal', payload: data });
}, [layerReady, data]);
```

### Layer Initialization Order
1. Create Mapbox map
2. Add PIXI custom layer to map
3. PIXI layer calls `onAdd` on all systems
4. Systems set `ready = true` and process queued messages
5. UI can now safely emit events

## Best Practices

- **Always check `ready`** before processing messages
- **Queue early messages** don't drop them
- **Guard all rendering** with existence checks
- **Make attach/detach idempotent** for React Fast Refresh
- **Add dev warnings** for lifecycle violations

## Common Gotchas

- Don't emit from React effects without layer readiness check
- Don't call `addChild` on undefined containers
- Don't assume Mapbox layers exist when PIXI is mounting
- Clean up all resources in `onRemove`