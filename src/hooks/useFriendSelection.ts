import { useEffect, useState } from 'react';

export interface FriendSelectionDetail {
  kind?: 'friend' | 'self';
  id: string;
  name?: string;
  avatarUrl?: string;
  vibe?: string;
  distanceM?: number;
  lastSeen?: number;
  lngLat: { lng: number; lat: number };
  color?: string;
}

/**
 * Hook to handle friend selection events from map interactions
 */
export function useFriendSelection() {
  const [selected, setSelected] = useState<FriendSelectionDetail | null>(null);

  useEffect(() => {
    const onSelect = (e: CustomEvent) => {
      setSelected(e.detail as FriendSelectionDetail);
    };

    window.addEventListener('friends:select', onSelect as EventListener);
    return () => window.removeEventListener('friends:select', onSelect as EventListener);
  }, []);

  const clear = () => setSelected(null);

  return { selected, clear };
}