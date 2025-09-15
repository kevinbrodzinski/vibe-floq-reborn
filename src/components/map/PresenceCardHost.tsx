import * as React from 'react';
import { PresenceInfoCard, PresenceSelection } from './PresenceInfoCard';

/**
 * Host component that manages presence card display
 * Listens to selection events and routes to unified card
 */
export function PresenceCardHost() {
  const [selection, setSelection] = React.useState<PresenceSelection | null>(null);

  React.useEffect(() => {
    const onFriend = (e: Event) => setSelection((e as CustomEvent).detail);
    const onVenue = (e: Event) => setSelection((e as CustomEvent).detail);
    const onSelf = (e: Event) => setSelection((e as CustomEvent).detail);
    
    window.addEventListener('friends:select', onFriend);
    window.addEventListener('venues:select', onVenue);
    window.addEventListener('self:select', onSelf);
    
    return () => {
      window.removeEventListener('friends:select', onFriend);
      window.removeEventListener('venues:select', onVenue);
      window.removeEventListener('self:select', onSelf);
    };
  }, []);

  return (
    <PresenceInfoCard
      selection={selection}
      onClose={() => setSelection(null)}
      onPing={(id) => {
        window.dispatchEvent(new CustomEvent('floq:ping', { detail: { id } }));
        // Analytics
        window.dispatchEvent(new CustomEvent('ui_card_action', { 
          detail: { kind: 'friend', action: 'ping', id } 
        }));
      }}
      onNavigate={(to, meta) => {
        window.dispatchEvent(new CustomEvent('floq:navigate', { detail: { to, meta } }));
        // Analytics
        window.dispatchEvent(new CustomEvent('ui_card_action', { 
          detail: { kind: meta?.type || 'unknown', action: 'navigate', id: meta?.venueId || meta?.friendId } 
        }));
      }}
      onRecenter={() => {
        window.dispatchEvent(new CustomEvent('floq:geolocate'));
        // Analytics
        window.dispatchEvent(new CustomEvent('ui_card_action', { 
          detail: { kind: 'self', action: 'recenter', id: 'self' } 
        }));
      }}
    />
  );
}