import { useMemo, useEffect } from 'react';
import { useUserLocation } from '@/hooks/useUserLocation';
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
  const { pos } = useUserLocation();      // live location from user gesture
  const { user } = useAuth();            // to tag the feature with our id

  /** Build the feature-collection every time inputs change */
  const geojson = useMemo(() => {
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

    if (pos && user?.id) {
      features.push(buildSelfFeature([pos.lng, pos.lat], user.id));
    }

    return { type: 'FeatureCollection', features } as const;
  }, [people, pos?.lng, pos?.lat, user?.id]);

  /* Push to Mapbox every time geojson changes */
  useEffect(() => {
    if (!map) return;
    const src = map.getSource('people') as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(geojson);
  }, [map, geojson]);
}