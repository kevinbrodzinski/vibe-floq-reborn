# Testing Guard Rails for Map/PIXI Consolidation

## Unit Tests (Add when Jest/Vitest is configured)

### MapContainerManager Tests

```typescript
describe('MapContainerManager', () => {
  it('should prepare container successfully on first use', () => {
    const container = document.createElement('div');
    container.className = 'test-container mapbox-gl h-full w-full';
    const mgr = MapContainerManager.getInstance();
    
    expect(mgr.prepareContainer(container)).toBe(true);
    expect(container.className).not.toContain('mapbox-gl'); // Mapbox classes removed
    expect(container.className).toContain('h-full w-full'); // Tailwind preserved
  });

  it('should allow container reuse after hot-reload', () => {
    const container = document.createElement('div');
    const mgr = MapContainerManager.getInstance();
    
    expect(mgr.prepareContainer(container)).toBe(true);
    mgr.releaseContainer(container);
    expect(mgr.prepareContainer(container)).toBe(true); // Should work again
  });
});
```

### PixiLifecycleManager Tests

```typescript
describe('PixiLifecycleManager', () => {
  it('should skip destroy when GL context already lost', () => {
    const fakeApp = { 
      renderer: { gl: { isContextLost: () => true } },
      destroy: jest.fn()
    };
    const mgr = PixiLifecycleManager.getInstance();
    
    mgr.destroyApp(fakeApp as any);
    
    expect(mgr.isDestroyed(fakeApp as any)).toBe(true);
    expect(fakeApp.destroy).not.toHaveBeenCalled(); // Should skip destroy
  });

  it('should clean up tracking set on destroy', () => {
    const fakeApp = { 
      renderer: { gl: { isContextLost: () => false } },
      ticker: { stop: jest.fn() },
      stage: { removeAllListeners: jest.fn(), removeChildren: jest.fn() },
      destroy: jest.fn()
    };
    const mgr = PixiLifecycleManager.getInstance();
    
    mgr.registerApp(fakeApp as any);
    mgr.destroyApp(fakeApp as any);
    
    expect(mgr.isDestroyed(fakeApp as any)).toBe(true); // Removed from Set
  });
});
```

## Manual Smoke Tests

### ✅ Functional Tests Checklist

| Test | Expected Result | Status |
|------|----------------|--------|
| Cold refresh `/` | Map boots, blue pin visible, no source warnings | ⏳ |
| Toggle dark/light theme | Pin + layers re-appear after style loads | ⏳ |
| Rapid HMR (⌘-S twice in 1s) | Zero GL context/destroy errors | ⏳ |
| Cluster zoom (tap 3+ floq cluster) | Smooth ease-to, counts update on split | ⏳ |
| Location permission denied | Demo coords → blue pin in SF, no spinner | ⏳ |

### 🔧 Performance Checks

**Chrome DevTools → Performance:**
- Record pinch-zoom on map
- Verify < 16ms frame time
- Clusters drawn once per zoom level

**Memory Tab:**
- Snapshot before/after 5 hot-reloads
- PIXI.Application instances stay flat
- activeApps Set should be empty after destroys

## Ship Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` under 4 MiB
- [ ] No console errors on cold refresh
- [ ] Blue "YOU" pin visible immediately
- [ ] Cluster zoom functionality preserved
- [ ] Dark/light theme switching works
- [ ] No WebGL context lost errors

## Regression Hotspots

**Watch for these in future changes:**

1. **Source timing**: Adding layers before sources exist
2. **GL context lifecycle**: Destroying already-lost contexts
3. **Container pollution**: Mapbox container not empty on init
4. **Memory leaks**: PIXI apps not cleaned from tracking sets
5. **Style reload**: Layers not re-added after `setStyle()`

## Critical Code Paths

### Container Preparation Flow
```
FieldWebMap.useEffect → MapContainerManager.prepareContainer → 
  Clear DOM + Remove mapbox classes + Preserve Tailwind → 
  mapboxgl.Map constructor
```

### PIXI Destruction Flow  
```
Component unmount → PixiLifecycleManager.destroyApp →
  Check GL context → Stop ticker → Remove listeners → 
  Destroy app → Clean tracking set
```

### Layer Initialization Flow
```
Map 'load' event → useMapLayers hook → 
  Add people source → Add selfLayer → 
  Add floq source + cluster layers
```

These paths must remain robust to prevent the original console errors from returning.