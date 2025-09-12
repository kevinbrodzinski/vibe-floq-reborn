import * as React from 'react';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { useRallyInboxUI } from '@/contexts/RallyInboxUIContext';

export function RallyNavBridge() {
  const { open, close, openThread } = useRallyInboxUI();

  React.useEffect(() => {
    const map = getCurrentMap();

    const onInboxOpen = () => open();
    const onInboxClose = () => close();
    const onInboxOpenThread = (e: Event) => {
      const { threadId } = (e as CustomEvent<{ threadId: string }>).detail || {};
      if (threadId) openThread(threadId);
    };

    const onRallyStart = (e: Event) => {
      const { centroid } = (e as CustomEvent<{ centroid?: { lng: number; lat: number } }>).detail || {};
      if (centroid && map?.flyTo) {
        map.flyTo({ center: [centroid.lng, centroid.lat], zoom: 15, essential: true });
      }
      // Optionally open the inbox on rally start:
      // open();
    };

    const onFlyTo = (e: Event) => {
      const { lng, lat, zoom = 15 } = (e as CustomEvent<{ lng: number; lat: number; zoom?: number }>).detail || {};
      if (Number.isFinite(lng) && Number.isFinite(lat) && map?.flyTo) {
        map.flyTo({ center: [lng, lat], zoom, essential: true });
      }
    };

    window.addEventListener('ui:rallyInbox:open', onInboxOpen as EventListener);
    window.addEventListener('ui:rallyInbox:close', onInboxClose as EventListener);
    window.addEventListener('ui:rallyInbox:openThread', onInboxOpenThread as EventListener);
    window.addEventListener('floq:rally:start', onRallyStart as EventListener);
    window.addEventListener('ui:map:flyTo', onFlyTo as EventListener);

    return () => {
      window.removeEventListener('ui:rallyInbox:open', onInboxOpen as EventListener);
      window.removeEventListener('ui:rallyInbox:close', onInboxClose as EventListener);
      window.removeEventListener('ui:rallyInbox:openThread', onInboxOpenThread as EventListener);
      window.removeEventListener('floq:rally:start', onRallyStart as EventListener);
      window.removeEventListener('ui:map:flyTo', onFlyTo as EventListener);
    };
  }, [open, close, openThread]);

  return null;
}