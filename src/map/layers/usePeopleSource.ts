import { useMemo, useEffect } from 'react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useFieldLocation } from '@/components/field/contexts/FieldLocationContext';
import { useAuth } from '@/providers/AuthProvider';
import { buildSelfFeature } from '@/map/geojson/selfFeature';
import mapboxgl from 'mapbox-gl';

export interface Person {
  id: string;
  lng: number;
  lat: number;
  isFriend?: boolean;
  vibe?: string;
}

/** Keeps the "people" GeoJSON in sync with props + GPS */
export function usePeopleSource(
  map: mapboxgl.Map | null,        // Mapbox instance ref
  people: Person[],                // incoming dots
) {
  const { location: fieldLocation } = useFieldLocation(); // Use consolidated field location
  const { user } = useAuth();            // to tag the feature with our id

  // Field location now uses useUserLocation internally
  const userPos = fieldLocation.pos;

  /** Build the feature-collection every time inputs change */
  const geojson = useMemo(() => {
    console.log('[usePeopleSource] Debug - Building GeoJSON:', {
      peopleCount: people.length,
      hasUserPos: !!userPos,
      userPosValue: userPos,
      hasFieldLocation: !!fieldLocation,
      fieldLocationValue: fieldLocation,
      hasUserId: !!user?.id,
      userId: user?.id
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

    if (userPos && user?.id) {
      const selfFeature = buildSelfFeature([userPos.lng, userPos.lat], user.id);
      features.push(selfFeature);
      console.log('[usePeopleSource] Added self feature:', selfFeature);
    } else {
      console.log('[usePeopleSource] NOT adding self feature - userPos:', userPos, 'user?.id:', user?.id);
    }

    console.log('[usePeopleSource] Final GeoJSON features count:', features.length);
    return { type: 'FeatureCollection', features } as const;
  }, [people, userPos?.lng, userPos?.lat, user?.id]);

  /* Push to Mapbox every time geojson changes */
  useEffect(() => {
    if (!map) return;
    const src = map.getSource('people') as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(geojson);
  }, [map, geojson]);
}