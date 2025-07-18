import { useMemo } from "react";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { useNearbyVenues } from "@/hooks/useNearbyVenues";
import { useActiveFloqs } from "@/hooks/useActiveFloqs";
import { useFieldTiles } from "@/hooks/useFieldTiles";
import { viewportToTileIds } from "@/lib/geo";
import type { Vibe } from "@/types";
import { FieldLocationProvider, useFieldLocation } from "@/components/field/contexts/FieldLocationContext";
import { FieldSocialProvider, type Person } from "@/components/field/contexts/FieldSocialContext";
import { FieldUIProvider, useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useFriends } from "@/hooks/useFriends";


export interface FloqEvent {
  id: string;
  title: string;
  x: number;
  y: number;
  size: number;
  participants: number;
  vibe: string;
}

export interface FieldData {
  // Events and venues
  floqEvents: FloqEvent[];
  walkableFloqs: any[];
  nearbyVenues: any[];
  currentEvent: any;
  // Field tiles data
  fieldTiles: any[];
  tileIds: string[];
  viewport: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null;
}

interface FieldDataProviderProps {
  children: (data: FieldData) => React.ReactNode;
}

export const FieldDataProvider = ({ children }: FieldDataProviderProps) => {
  const { friends: friendIds, profiles } = useFriends();

  return (
    <FieldLocationProvider friendIds={friendIds}>
      <FieldSocialProvider profiles={profiles}>
        <FieldUIProvider>
          <FieldDataProviderInner>
            {children}
          </FieldDataProviderInner>
        </FieldUIProvider>
      </FieldSocialProvider>
    </FieldLocationProvider>
  );
};

interface FieldDataProviderInnerProps {
  children: (data: FieldData) => React.ReactNode;
}

const FieldDataProviderInner = ({ children }: FieldDataProviderInnerProps) => {
  const { location } = useFieldLocation();
  const { setShowBanner } = useFieldUI();
  
  // Define viewport bounds based on location
  const viewport = useMemo(() => {
    if (!location?.lat || !location?.lng) return null;
    
    const radius = 0.01; // ~1km viewport
    return {
      minLat: location.lat - radius,
      maxLat: location.lat + radius,
      minLng: location.lng - radius,
      maxLng: location.lng + radius,
    };
  }, [location?.lat, location?.lng]);

  // Get tile IDs for current viewport
  const tileIds = useMemo(() => {
    if (!viewport) return [];
    return viewportToTileIds(
      viewport.minLat,
      viewport.maxLat,
      viewport.minLng,
      viewport.maxLng,
      6
    );
  }, [viewport]);

  // Get field tiles data
  const { data: fieldTiles = [] } = useFieldTiles(viewport ? {
    minLat: viewport.minLat,
    maxLat: viewport.maxLat,
    minLng: viewport.minLng,
    maxLng: viewport.maxLng,
    precision: 6
  } : undefined);
  
  // Get nearby venues for chip and current event
  const { data: nearbyVenues = [] } = useNearbyVenues(location?.lat ?? 0, location?.lng ?? 0, 0.3);
  const { data: currentEvent } = useCurrentEvent(location?.lat ?? 0, location?.lng ?? 0, () => setShowBanner(false));
  
  // Get walkable floqs using the hook
  const { data: activeFloqs = [] } = useActiveFloqs({ limit: 50 });
  const walkable_floqs = activeFloqs.map(floq => ({
    id: floq.id,
    title: floq.title,
    primary_vibe: floq.primary_vibe as Vibe,
    participant_count: floq.participant_count,
    distance_meters: floq.distance_meters || 0,
    starts_at: floq.starts_at
  }));

  // Simple floq events conversion for baseline
  const floqEvents: FloqEvent[] = walkable_floqs.map((floq, index) => ({
    id: floq.id,
    title: floq.title,
    x: 30 + (index * 25) % 50,
    y: 40 + (index * 20) % 40,
    size: Math.min(Math.max(40 + floq.participant_count * 8, 40), 100),
    participants: floq.participant_count,
    vibe: floq.primary_vibe,
  }));

  const data: FieldData = {
    // Events and venues
    floqEvents,
    walkableFloqs: walkable_floqs,
    nearbyVenues,
    currentEvent,
    // Field tiles data
    fieldTiles,
    tileIds,
    viewport,
  };

  return children(data);
};