import * as React from 'react';
import { layerManager } from '@/lib/map/LayerManager';
import type { ApplyEvent } from '@/lib/map/LayerManager';

/**
 * Dev hook to observe LayerManager apply events
 * Useful for debugging and performance monitoring
 */
export function useLayerApplies() {
  const [events, setEvents] = React.useState<ApplyEvent[]>([]);
  
  React.useEffect(() => {
    const off = layerManager.onApply((event) => {
      setEvents((prev) => [event, ...prev].slice(0, 200)); // keep last 200
    });
    return off;
  }, []);

  return events;
}