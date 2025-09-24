import { useMemo, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { MapFloq } from '@/types/mapEntities';

/** Manages the "floqs" GeoJSON source for Mapbox */
export function useFloqsSource(
  map: mapboxgl.Map | null,
  floqs: MapFloq[]
) {
  /** Build the GeoJSON FeatureCollection for floqs */
  const geojson = useMemo(() => {
    console.log('[useFloqsSource] Building GeoJSON with', floqs.length, 'floqs');
    
    const features: GeoJSON.Feature[] = floqs.map(floq => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [floq.lng, floq.lat] },
      properties: {
        id: floq.id,
        title: floq.title,
        description: floq.description,
        vibe: floq.primary_vibe || floq.vibe_tag,
        participant_count: floq.participant_count || 0,
        participants: floq.participant_count || 0,
        distance_meters: floq.distance_meters,
        friend_name: floq.friend_name,
        address: floq.address,
        creator_id: floq.creator_id,
        starts_at: floq.starts_at,
        ends_at: floq.ends_at,
        max_participants: floq.max_participants,
        radius_m: floq.radius_m,
        type: 'floq'
      },
    }));

    console.log('[useFloqsSource] Generated', features.length, 'floq features');
    return { type: 'FeatureCollection', features } as const;
  }, [floqs]);

  /** Helper to safely access/create the floqs source */
  const withFloqsSource = useCallback((cb: (src: mapboxgl.GeoJSONSource) => void) => {
    if (!map) return;
    
    // Wait until style is loaded before any source operations
    if (map.isStyleLoaded()) {
      const srcId = 'floqs';
      let src = map.getSource(srcId) as mapboxgl.GeoJSONSource | undefined;
      
      // Create source if it doesn't exist (safe to do once style is loaded)
      if (!src) {
        console.log('[useFloqsSource] Creating floqs source with clustering');
        map.addSource(srcId, { 
          type: 'geojson', 
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterRadius: 80,
          clusterProperties: {
            // Keep separate counts for each vibe category in a cluster
            'social': ['+', ['case', ['==', ['get', 'vibe'], 'social'], 1, 0]],
            'hype': ['+', ['case', ['==', ['get', 'vibe'], 'hype'], 1, 0]],
            'curious': ['+', ['case', ['==', ['get', 'vibe'], 'curious'], 1, 0]],
            'chill': ['+', ['case', ['==', ['get', 'vibe'], 'chill'], 1, 0]],
            'solo': ['+', ['case', ['==', ['get', 'vibe'], 'solo'], 1, 0]],
            'romantic': ['+', ['case', ['==', ['get', 'vibe'], 'romantic'], 1, 0]],
            'weird': ['+', ['case', ['==', ['get', 'vibe'], 'weird'], 1, 0]],
            'down': ['+', ['case', ['==', ['get', 'vibe'], 'down'], 1, 0]],
            'flowing': ['+', ['case', ['==', ['get', 'vibe'], 'flowing'], 1, 0]],
            'open': ['+', ['case', ['==', ['get', 'vibe'], 'open'], 1, 0]]
          }
        });
        src = map.getSource(srcId) as mapboxgl.GeoJSONSource;
      }
      
      return cb(src);
    }
    
    // Style not ready yet – wait for next styledata event
    map.once('styledata', () => withFloqsSource(cb));
  }, [map]);

  /** Update the source data when floqs change */
  useEffect(() => {
    if (!map) return;
    
    withFloqsSource((src) => {
      console.log('[useFloqsSource] Updating source with', geojson.features.length, 'features');
      src.setData(geojson);
    });
  }, [map, geojson, withFloqsSource]);

  return { geojson };
}