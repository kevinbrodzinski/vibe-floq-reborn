import * as React from 'react';
import { useRallyInbox } from '@/hooks/useRallyInbox';
import { RallyInboxDrawer } from '@/components/rally/RallyInboxDrawer';

/**
 * Listens for:
 *  - ui:rallyInbox:open
 *  - ui:rallyInbox:close
 *  - ui:rallyInbox:openThread  { threadId }
 *
 * Renders the RallyInboxDrawer and forwards actions to useRallyInbox().
 * Also relays "view on map" to the map via ui:map:flyTo + ui:nav:dest.
 */
export function InboxNavBridge() {
  const { items, loading, error, join, decline } = useRallyInbox();

  const [open, setOpen] = React.useState(false);
  const threadToOpenRef = React.useRef<string | null>(null); // reserved for future "open thread" view

  // Wire custom events
  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    const onOpenThread = (e: Event) => {
      const d = (e as CustomEvent<{ threadId: string }>).detail;
      if (d?.threadId) {
        threadToOpenRef.current = d.threadId;
        setOpen(true);
        // If you add a thread view later, you can route here.
        if (import.meta.env.DEV) console.debug('[InboxNavBridge] openThread', d.threadId);
      } else {
        setOpen(true);
      }
    };

    window.addEventListener('ui:rallyInbox:open', onOpen);
    window.addEventListener('ui:rallyInbox:close', onClose);
    window.addEventListener('ui:rallyInbox:openThread', onOpenThread as EventListener);

    return () => {
      window.removeEventListener('ui:rallyInbox:open', onOpen);
      window.removeEventListener('ui:rallyInbox:close', onClose);
      window.removeEventListener('ui:rallyInbox:openThread', onOpenThread as EventListener);
    };
  }, []);

  // "View on map" → fly + pulse (using your nav event layer)
  const onViewMap = React.useCallback((itm: any) => {
    const lng = Number(itm?.center_lng);
    const lat = Number(itm?.center_lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    window.dispatchEvent(new CustomEvent('ui:map:flyTo', { detail: { lng, lat, zoom: 15 } }));
    window.dispatchEvent(new CustomEvent('ui:nav:dest', { detail: { lng, lat, duration: 1600 } }));
  }, []);

  return (
    <RallyInboxDrawer
      open={open}
      items={items}
      loading={loading}
      error={error ?? null}
      onClose={() => setOpen(false)}
      onJoin={join}
      onDecline={decline}
      onViewMap={onViewMap}
    />
  );
}