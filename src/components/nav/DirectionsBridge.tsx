import * as React from 'react';
import { onEvent, Events } from '@/services/eventBridge';
import { openDirections } from '@/lib/directions/handoff';

export function DirectionsBridge() {
  React.useEffect(() => {
    return onEvent(Events.UI_OPEN_DIRECTIONS, ({ lat, lng, label, mode }) => {
      try { openDirections({ dest: { lat, lng }, label, mode }); } catch {/* noop */ }
    });
  }, []);
  return null;
}