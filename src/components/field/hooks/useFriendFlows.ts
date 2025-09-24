import * as React from 'react';
import { fetchFriendFlows, FriendFlowLine } from '@/lib/api/friendFlows';

export function useFriendFlows(map: any | null, debounceMs = 300) {
  const [items, setItems] = React.useState<FriendFlowLine[]>([]);
  
  React.useEffect(() => {
    if (!map) return;
    
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const loadFriendFlows = async () => {
      try {
        const bounds = map.getBounds?.();
        if (!bounds) return;
        
        const bbox: [number, number, number, number] = [
          bounds.getWest(), 
          bounds.getSouth(), 
          bounds.getEast(), 
          bounds.getNorth()
        ];
        
        const flows = await fetchFriendFlows({ 
          bbox, 
          sinceMinutes: 90 
        });
        
        setItems(flows);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[useFriendFlows] Failed to load friend flows:', error);
        setItems([]);
      }
    };
    
    const debouncedLoad = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(loadFriendFlows, debounceMs);
    };
    
    // Initial load
    debouncedLoad();
    
    // Listen for map changes
    map.on?.('moveend', debouncedLoad);
    
    return () => {
      try { map.off?.('moveend', debouncedLoad); } catch {}
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [map, debounceMs]);
  
  return items;
}