import * as React from 'react';
import { onEvent, Events } from '@/services/eventBridge';
import { openDirections } from '@/lib/directions/handoff';

export function DirectionsBridge() {
  React.useEffect(() => {
    return onEvent(Events.UI_OPEN_DIRECTIONS, ({ to, mode }) => {
      try { openDirections({ dest: { lat: to.lat, lng: to.lng }, label: to.name, mode }); } catch {/* noop */ }
    });
  }, []);
  return null;
}