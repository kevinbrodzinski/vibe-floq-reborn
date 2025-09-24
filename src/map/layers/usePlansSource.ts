import { useMemo, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { MapPlan } from '@/types/mapEntities';

/** Manages the "plans" GeoJSON source for Mapbox */
export function usePlansSource(
  map: mapboxgl.Map | null,
  plans: MapPlan[]
) {
  /** Build the GeoJSON FeatureCollection for plans */
  const geojson = useMemo(() => {
    console.log('[usePlansSource] Building GeoJSON with', plans.length, 'plans');
    
    const features: GeoJSON.Feature[] = plans.map(plan => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [plan.lng, plan.lat] },
      properties: {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        status: plan.status,
        vibe_tag: plan.vibe_tag,
        vibe_tags: plan.vibe_tags,
        primary_vibe: plan.vibe_tags?.[0] || plan.vibe_tag, // Use first vibe tag as primary
        stop_count: plan.stop_count || 1,
        participant_count: plan.participant_count || 0,
        participants: plan.participant_count || 0,
        distance_meters: plan.distance_meters,
        friend_name: plan.friend_name,
        address: plan.address,
        creator_id: plan.creator_id,
        planned_at: plan.planned_at,
        start_time: plan.start_time,
        end_time: plan.end_time,
        max_participants: plan.max_participants,
        type: 'plan'
      },
    }));

    console.log('[usePlansSource] Generated', features.length, 'plan features');
    return { type: 'FeatureCollection', features } as const;
  }, [plans]);

  /** Helper to safely access/create the plans source */
  const withPlansSource = useCallback((cb: (src: mapboxgl.GeoJSONSource) => void) => {
    if (!map) return;
    
    // Wait until style is loaded before any source operations
    if (map.isStyleLoaded()) {
      const srcId = 'plans';
      let src = map.getSource(srcId) as mapboxgl.GeoJSONSource | undefined;
      
      // Create source if it doesn't exist (safe to do once style is loaded)
      if (!src) {
        console.log('[usePlansSource] Creating plans source with clustering');
        map.addSource(srcId, { 
          type: 'geojson', 
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterRadius: 90, // Slightly larger radius than floqs for differentiation
          clusterProperties: {
            // Aggregate plan properties in clusters
            'total_stops': ['+', ['get', 'stop_count']],
            'active_count': ['+', ['case', ['==', ['get', 'status'], 'active'], 1, 0]],
            'draft_count': ['+', ['case', ['==', ['get', 'status'], 'draft'], 1, 0]],
            'completed_count': ['+', ['case', ['==', ['get', 'status'], 'completed'], 1, 0]]
          }
        });
        src = map.getSource(srcId) as mapboxgl.GeoJSONSource;
      }
      
      return cb(src);
    }
    
    // Style not ready yet – wait for next styledata event
    map.once('styledata', () => withPlansSource(cb));
  }, [map]);

  /** Update the source data when plans change */
  useEffect(() => {
    if (!map) return;
    
    withPlansSource((src) => {
      console.log('[usePlansSource] Updating source with', geojson.features.length, 'features');
      src.setData(geojson);
    });
  }, [map, geojson, withPlansSource]);

  return { geojson };
}