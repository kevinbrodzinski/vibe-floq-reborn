
import { useMemo, useState, useEffect } from "react";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { useNearbyVenues } from "@/hooks/useNearbyVenues";
import { useActiveFloqs } from "@/hooks/useActiveFloqs";
import { useFieldTiles } from "@/hooks/useFieldTiles";
import { useFieldTileSync } from "@/hooks/useFieldTileSync";
import { useAutoVenueSync } from "@/hooks/useVenueSync";

import { supabase } from "@/integrations/supabase/client";
import { usePresencePublisher } from "@/hooks/usePresencePublisher";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";
import { viewportToTileIds } from "@/lib/geo";
import { getCachedAddress } from '@/utils/geoUtils';
// Simple projection function that doesn't require a map instance
const simpleProjectLatLng = (lng: number, lat: number, userLat?: number, userLng?: number) => {
  if (!userLat || !userLng) {
    // Fallback to simple positioning if no user location
    return { x: 50, y: 50 };
  }

  // Simple projection based on geographic distance from user
  const latDiff = lat - userLat;
  const lngDiff = lng - userLng;

  // Convert to field coordinates: ~111km per degree lat, ~111km * cos(lat) per degree lng
  const xMeters = lngDiff * 111320 * Math.cos((userLat * Math.PI) / 180);
  const yMeters = latDiff * 111320;

  // Scale to field coordinates (field is 0-100%, assuming 2km view radius)
  const scale = 50; // 50% field width per km
  const x = Math.min(Math.max((xMeters / 1000) * scale + 50, 5), 95);
  const y = Math.min(Math.max(-(yMeters / 1000) * scale + 50, 5), 95);

  return { x, y };
};

// Proper map-to-screen coordinate conversion
const projectToScreenCoords = (
  lat: number,
  lng: number,
  viewport: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  screenWidth: number,
  screenHeight: number
) => {
  // Calculate the percentage position within the viewport
  const latPercent = (lat - viewport.minLat) / (viewport.maxLat - viewport.minLat);
  const lngPercent = (lng - viewport.minLng) / (viewport.maxLng - viewport.minLng);

  // Convert to screen coordinates
  const x = lngPercent * screenWidth;
  const y = (1 - latPercent) * screenHeight; // Invert Y axis for screen coordinates

  return { x, y };
};
import type { Vibe } from "@/types";
import { safeVibe } from '@/types/enums/vibes';
import { FieldLocationProvider, useFieldLocation } from "@/components/field/contexts/FieldLocationContext";
import { FieldSocialProvider, type Person } from "@/components/field/contexts/FieldSocialContext";
import { FieldUIProvider, useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useUnifiedFriends } from "@/hooks/useUnifiedFriends";

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
  // Real-time status
  realtime: boolean;
  // Debug visuals
  showDebugVisuals: boolean;
}

interface FieldDataProviderProps {
  children: (data: FieldData) => React.ReactNode;
}

export const FieldDataProvider = ({ children }: FieldDataProviderProps) => {
  const { friendIds, rows } = useUnifiedFriends();
  
  // Convert to expected profile format
  const profiles = rows.filter(row => row.friend_state === 'accepted').map(row => ({
    id: row.id,
    username: row.username || '',
    display_name: row.display_name || row.username || '',
    avatar_url: row.avatar_url,
    bio: null // Not available in unified friends
  }));

  console.log('[FieldDataProvider] Rendering with friendIds:', friendIds, 'profiles:', profiles);

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
  const { data: activeFloqs = [] } = useActiveFloqs();
  const [floqsWithAddresses, setFloqsWithAddresses] = useState<any[]>([]);


  // Enhance floqs with addresses
  useEffect(() => {
    const enhanceFloqsWithAddresses = async () => {
      const enhancedFloqs = await Promise.all(
        (Array.isArray(activeFloqs) ? activeFloqs : 'pages' in activeFloqs ? activeFloqs.pages.flat() : []).map(async (floq) => {
          if (floq.lat && floq.lng) {
            const address = await getCachedAddress(floq.lat, floq.lng);
            return {
              ...floq,
              address: address || null
            };
          }
          return floq;
        })
      );
      setFloqsWithAddresses(enhancedFloqs);
    };

    const flatActiveFloqs = Array.isArray(activeFloqs) ? activeFloqs : 'pages' in activeFloqs ? activeFloqs.pages.flat() : [];
    if (flatActiveFloqs.length > 0) {
      enhanceFloqsWithAddresses();
    }
  }, [activeFloqs]);

  const walkable_floqs = useMemo(() => {
    return floqsWithAddresses.map(floq => ({
      id: floq.id,
      title: floq.title,
      primary_vibe: safeVibe(floq.primary_vibe),
      participant_count: floq.participant_count,
      distance_meters: floq.distance_meters || 0,
      starts_at: floq.starts_at,
      lat: floq.lat,
      lng: floq.lng,
      friend_name: (floq as any).friends_going_names?.[0] || null,
      address: floq.address || null,
    }));
  }, [floqsWithAddresses]);

  const { setShowBanner } = useFieldUI();

  // Start publishing user presence to the field only when location is available
  const isLocationAvailable = !!(location?.pos?.lat && location?.pos?.lng);
  usePresencePublisher(isLocationAvailable);

  // Enable real-time presence updates for friend tracking
  const [presenceUpdates, setPresenceUpdates] = useState<any[]>([]);
  useRealtimePresence({
    enabled: isLocationAvailable,
    onPresenceUpdate: (update) => {
      console.log('[RealtimePresence] Friend presence update:', update);
      setPresenceUpdates(prev => {
        const filtered = prev.filter(p => p.profile_id !== update.profile_id);
        return [...filtered, update];
      });
    },
    onPresenceRemove: (profileId) => {
      console.log('[RealtimePresence] Friend went offline:', profileId);
      setPresenceUpdates(prev => prev.filter(p => p.profile_id !== profileId));
    }
  });

  // Define viewport bounds based on location
  const viewport = useMemo(() => {
    if (!location?.pos?.lat || !location?.pos?.lng) return null;

    const radius = 0.01; // ~1km viewport
    return {
      minLat: location.pos.lat - radius,
      maxLat: location.pos.lat + radius,
      minLng: location.pos.lng - radius,
      maxLng: location.pos.lng + radius,
    };
  }, [location?.pos?.lat, location?.pos?.lng]);

  // Get tile IDs for current viewport
  const tileIds = useMemo(() => {
    if (!viewport) return [];
    const ids = viewportToTileIds(
      viewport.minLat,
      viewport.maxLat,
      viewport.minLng,
      viewport.maxLng,
      6
    );

    // Debug helper - expose to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).__debug_tiles = ids;
      console.log('[FIELD_DEBUG] Tile IDs for viewport:', ids);
    }

    return ids;
  }, [viewport]);

  // Enable field tile sync automation
  useFieldTileSync();

  // Get field tiles data
  const { data: fieldTiles = [], error: tilesError, isLoading } = useFieldTiles(
    viewport ? {
      minLat: viewport.minLat,
      maxLat: viewport.maxLat,
      minLng: viewport.minLng,
      maxLng: viewport.maxLng,
      precision: 6
    } : undefined
  );

  // Debug logging for field tiles
  console.log('[FIELD_DEBUG] Field tiles query state:', {
    isLoading,
    error: tilesError ? {
      name: tilesError.name,
      message: tilesError.message,
    } : null,
    tilesCount: fieldTiles?.length || 0,
    tiles: fieldTiles?.slice(0, 3), // Show first 3 tiles only for debug
    viewport
  });

  // Auto-sync venues when location changes
  const venueSync = useAutoVenueSync(
    location?.pos?.lat, 
    location?.pos?.lng, 
    { showToasts: false, minDistanceM: 300 }
  );

  // Get nearby venues for chip and current event
  const { data: nearbyVenues = [] } = useNearbyVenues(location?.pos?.lat ?? 0, location?.pos?.lng ?? 0, 0.3);
  const { data: currentEvent } = useCurrentEvent(location?.pos?.lat ?? 0, location?.pos?.lng ?? 0, () => setShowBanner(false));

  // Debug logging for location and viewport
  console.log('[FIELD_DEBUG] Location and viewport:', {
    location: location?.pos ? { lat: location.pos.lat, lng: location.pos.lng } : null,
    viewport,
    activeFloqsCount: Array.isArray(activeFloqs) ? activeFloqs.length : 'pages' in activeFloqs ? activeFloqs.pages.flat().length : 0
  });

  // Floqs are now rendered by Mapbox clustering, not PIXI
  const floqEvents: FloqEvent[] = [];

  // Debug log the floqs being passed to Mapbox
  console.log('[FIELD_DEBUG] Floqs for Mapbox:', (floqsWithAddresses || []).map(floq => ({
    id: floq.id,
    title: floq.title,
    lat: floq.lat,
    lng: floq.lng,
    vibe: floq.primary_vibe,
    participants: floq.participant_count
  })));

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
    // Real-time status
    realtime: true,
    // Debug visuals disabled
    showDebugVisuals: false,
  };

  return (
    <>
      {children(data)}
    </>
  );
};
