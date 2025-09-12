# Nav Layer Usage Examples

The nav layer provides a clean event-driven API for map navigation and inbox control.

## Import the helpers

```typescript
import { flyTo, flyToAndPulse, openInbox, openInboxThread, floqUp } from '@/lib/nav/nav';
```

## Basic usage

```typescript
// Simple map pan to coordinates
flyTo(-118.49, 34.0, 15); // lng, lat, zoom

// Pan + visual pulse feedback
flyToAndPulse(-118.49, 34.0, 15); // lng, lat, zoom

// Open rally inbox
openInbox();

// Open specific thread
openInboxThread('thread_12345');

// Full "Floq Up" experience: pan, pulse, open directions
floqUp(34.0, -118.49, 'Coffee Shop'); // lat, lng, label
```

## Components can listen to events directly

```typescript
React.useEffect(() => {
  const onMapFly = (e: WindowEventMap['ui:map:flyTo']) => {
    console.log('Map flying to:', e.detail);
  };
  
  window.addEventListener('ui:map:flyTo', onMapFly);
  return () => window.removeEventListener('ui:map:flyTo', onMapFly);
}, []);
```

## Architecture

- `MapNavBridge`: Listens for map events, controls Mapbox instance
- `InboxNavBridge`: Listens for inbox events, controls drawer state  
- `RallyNavBridge`: Handles rally-specific events and map coordination
- Type-safe events via `WindowEventMap` augmentation