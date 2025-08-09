import { useMemo, useEffect, useCallback } from 'react';
import { useFieldLocation } from '@/components/field/contexts/FieldLocationContext';
import { useAuth } from '@/hooks/useAuth';
import { buildSelfFeature } from '@/map/geojson/selfFeature';
import mapboxgl from 'mapbox-gl';

export interface Person {
  id: string;
  lng: number;
  lat: number;
  isFriend?: boolean;
  vibe?: string;
  you?: boolean; // 🔧 Add property to mark current user
}

/** Keeps the "people" GeoJSON in sync with props + GPS */
export function usePeopleSource(
  map: mapboxgl.Map | null,        // Mapbox instance ref
  people: Person[],                // incoming dots
) {
  const { location: fieldLocation } = useFieldLocation(); // Use consolidated field location
  const { user } = useAuth();            // to tag the feature with our id

  // Field location now uses useUnifiedLocation internally
  const userPos = fieldLocation.coords;

  /** Build the feature-collection every time inputs change */
  const geojson = useMemo(() => {
    console.log('[usePeopleSource] Debug - Building GeoJSON:', {
      peopleCount: people.length,
      hasUserPos: !!userPos,
      userPosValue: userPos,
      hasFieldLocation: !!fieldLocation,
      fieldLocationValue: fieldLocation,
      hasProfileId: !!user?.id,
      profileId: user?.id
    });

    const features: GeoJSON.Feature[] = people.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        vibe: p.vibe,
        me: false,
        friend: !!p.isFriend,
      },
    }));

    if (userPos) {
      const selfId = user?.id ?? 'current-user';
      const selfFeature = buildSelfFeature([userPos.lng, userPos.lat], selfId);
      features.push(selfFeature);
      console.log('[usePeopleSource] Added self feature:', selfFeature);
    } else {
      console.log('[usePeopleSource] 🔧 NOT adding self feature - userPos:', userPos, 'user?.id:', user?.id);
      console.log('[usePeopleSource] 🔧 Available people for self detection:', people.map(p => ({ id: p.id, you: p.you, lat: p.lat, lng: p.lng })));
    }

    console.log('[usePeopleSource] Final GeoJSON features count:', features.length);
    return { type: 'FeatureCollection', features } as const;
  }, [people, userPos?.lng, userPos?.lat, user?.id]);

  /* Helper to safely access map source - handles creation AND access */
  const withPeopleSource = useCallback((cb: (src: mapboxgl.GeoJSONSource) => void) => {
    if (!map) return;
    
    // Wait until style is loaded before any source operations
    if (map.isStyleLoaded()) {
      const srcId = 'people';
      let src = map.getSource(srcId) as mapboxgl.GeoJSONSource | undefined;
      
      // Create source if it doesn't exist (safe to do once style is loaded)
      if (!src) {
        map.addSource(srcId, { 
          type: 'geojson', 
          data: { type: 'FeatureCollection', features: [] }
        });
        src = map.getSource(srcId) as mapboxgl.GeoJSONSource;
      }
      
      return cb(src);
    }
    
    // Style not ready yet – wait for next styledata event
    map.once('styledata', () => withPeopleSource(cb));
  }, [map]);

  /* Push to Mapbox every time geojson changes */
  useEffect(() => {
    if (!map) return;
    
    // 🔑 Use withPeopleSource to handle both source creation AND data updates
    // This ensures we wait for style loading before any source operations
    withPeopleSource((src) => {
      src.setData(geojson);
    });
  }, [map, geojson, withPeopleSource]);
}