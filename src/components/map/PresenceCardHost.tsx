import * as React from 'react';
import { PresenceInfoCard } from './PresenceInfoCard';
import { ConvergeSuggestions } from './ConvergeSuggestions';
import { AcceptRouteCard } from './AcceptRouteCard';
import { emitEvent, onEvent, Events } from '@/services/eventBridge';
import type { PresencePayload } from '@/types/presence';

export const PresenceCardHost: React.FC = () => {
  const [data, setData] = React.useState<PresencePayload | null>(null);
  const [acceptTo, setAcceptTo] = React.useState<{ lat: number; lng: number; name?: string } | null>(null);

  // Open info card from selection events
  React.useEffect(() => {
    const onFriend = (e: Event) => setData((e as CustomEvent<PresencePayload>).detail);
    const onVenue  = (e: Event) => setData((e as CustomEvent<PresencePayload>).detail);
    window.addEventListener('friends:select', onFriend as EventListener);
    window.addEventListener('venues:select',  onVenue  as EventListener);
    return () => {
      window.removeEventListener('friends:select', onFriend as EventListener);
      window.removeEventListener('venues:select',  onVenue  as EventListener);
    };
  }, []);

  // Legacy interop → window events to UI state
  React.useEffect(() => {
    const onLegacy = (e: Event) => {
      const point = (e as CustomEvent<{ point: { lat: number; lng: number; name?: string } }>).detail?.point;
      if (point) setAcceptTo(point);
    };
    window.addEventListener('converge:request', onLegacy as EventListener);
    return () => window.removeEventListener('converge:request', onLegacy as EventListener);
  }, []);

  // Typed converge request → show inline accept  
  React.useEffect(() => {
    return onEvent(Events.FLOQ_CONVERGE_REQUEST, ({ point }) => setAcceptTo(point));
  }, []);

  // ESC closes open cards
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setData(null); setAcceptTo(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <PresenceInfoCard data={data} onClose={() => setData(null)} />
      <ConvergeSuggestions onClose={() => {}} />
      {acceptTo && (
        <AcceptRouteCard
          to={acceptTo}
          onAccept={() => { 
            if (acceptTo) emitEvent(Events.UI_OPEN_DIRECTIONS, { to: acceptTo }); 
            setAcceptTo(null); 
          }}
          onClose={() => setAcceptTo(null)}
        />
      )}
    </>
  );
};