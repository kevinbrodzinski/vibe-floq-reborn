import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { usePeopleSource } from '@/map/layers/usePeopleSource';
import { useFloqsSource } from '@/map/layers/useFloqsSource';
import { usePlansSource } from '@/map/layers/usePlansSource';
import { selfLayer } from '@/map/layers/selfLayer';
import { friendsLayer } from '@/map/layers/friendsLayer';
import { floqPointsLayer, floqClustersLayer, floqClusterCountLayer } from '@/map/layers/floqsLayer';
import { planPointsLayer, planClustersLayer, planClusterCountLayer, planStopCountLayer } from '@/map/layers/plansLayer';
import type { Person } from '@/map/layers/usePeopleSource';
import type { MapFloq, MapPlan } from '@/types/mapEntities';

/**
 * useMapLayers - Unified layer management for Mapbox maps
 * Coordinates people source, self layer, and floq clustering
 * Preserves all existing functionality including cluster zoom
 */

interface UseMapLayersProps {
  map: mapboxgl.Map | null;
  people: Person[];
  floqs: MapFloq[];
  plans: MapPlan[];
  onClusterClick?: (clusterId: number, coordinates: [number, number]) => void;
}

export function useMapLayers({ 
  map, 
  people, 
  floqs,
  plans,
  onClusterClick 
}: UseMapLayersProps) {
  const layersInitialized = useRef(false);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Initialize all sources
  usePeopleSource(map, people);
  useFloqsSource(map, floqs);
  usePlansSource(map, plans);

  // Initialize layers once map is ready and reset on style changes
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    // Reset initialization flag on style changes
    const handleStyleData = () => {
      layersInitialized.current = false;
      // Note: 'people' source is now managed by usePeopleSource hook
    };

    map.on('styledata', handleStyleData);

    if (layersInitialized.current) return;

    console.log('[useMapLayers] Initializing unified layers');

    try {
      // Note: 'people' source is now managed by usePeopleSource hook

      // Note: Sources are now managed by dedicated hooks (useFloqsSource, usePlansSource)

      // Add friends layer (vibe-colored friend dots)
      if (!map.getLayer('friends-pins')) {
        map.addLayer(friendsLayer);
      }

      // Add self layer (blue "YOU" pin) - preserve existing functionality  
      if (!map.getLayer('me-pin')) {
        map.addLayer(selfLayer);
      }

      // Add floq layers (single-stop activities)
      if (!map.getLayer('floq-clusters')) {
        map.addLayer(floqClustersLayer);
      }
      
      if (!map.getLayer('floq-cluster-count')) {
        map.addLayer(floqClusterCountLayer);
      }
      
      if (!map.getLayer('floq-points')) {
        map.addLayer(floqPointsLayer);
      }

      // Add plan layers (multi-stop activities)
      if (!map.getLayer('plan-clusters')) {
        map.addLayer(planClustersLayer);
      }
      
      if (!map.getLayer('plan-cluster-count')) {
        map.addLayer(planClusterCountLayer);
      }
      
      if (!map.getLayer('plan-points')) {
        map.addLayer(planPointsLayer);
      }
      
      if (!map.getLayer('plan-stop-indicators')) {
        map.addLayer(planStopCountLayer);
      }

      layersInitialized.current = true;
      console.log('[useMapLayers] All layers initialized successfully');

    } catch (error) {
      console.error('[useMapLayers] Layer initialization error:', error);
    }

    return () => {
      map.off('styledata', handleStyleData);
    };
  }, [map]);

  // Cluster click handler (preserve exact existing zoom functionality) - GUARDED
  const handleClusterClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!map || !map.getLayer('floq-clusters')) return;

    const features = map.queryRenderedFeatures(e.point, {
      layers: ['floq-clusters']
    });

    if (!features.length) return;

    const clusterId = features[0].properties?.cluster_id;
    const coordinates = (features[0].geometry as any).coordinates;

    // Close any existing popup
    if (popupRef.current) {
      popupRef.current.remove();
    }

    // Call custom handler if provided
    if (onClusterClick) {
      onClusterClick(clusterId, coordinates);
    }

    // Default zoom behavior (preserve existing)
    if (map.isStyleLoaded()) {
      const source = map.getSource('floqs') as mapboxgl.GeoJSONSource;
      if (source) {
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;

          map.easeTo({
            center: coordinates,
            zoom: zoom,
            duration: 800,
            easing: (t) => t * (2 - t) // Smooth ease-out
          });
        });
      }
    }
  }, [map, onClusterClick]);

  // Add event listeners (preserve existing functionality) - GUARDED
  useEffect(() => {
    if (!map || !layersInitialized.current) return;

    // Cluster click events - GUARDED
    const handleClusterClickGuarded = (e: mapboxgl.MapMouseEvent) => {
      if (!map.getLayer('floq-clusters')) return;
      handleClusterClick(e);
    };

    // Cursor effects - use any type for event handlers to avoid TS mapbox issues - GUARDED
    const handleClusterEnter = () => {
      if (!map.getLayer('floq-clusters')) return;
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleClusterLeave = () => {
      if (!map.getLayer('floq-clusters')) return;
      map.getCanvas().style.cursor = '';
    };

    const handleFloqEnter = () => {
      if (!map.getLayer('floq-points')) return;
      map.getCanvas().style.cursor = 'pointer';
      map.setPaintProperty('floq-points', 'circle-radius', 16);
      map.setPaintProperty('floq-points', 'circle-opacity', 1);
      map.setPaintProperty('floq-points', 'circle-stroke-width', 3);
    };

    const handleFloqLeave = () => {
      if (!map.getLayer('floq-points')) return;
      map.getCanvas().style.cursor = '';
      map.setPaintProperty('floq-points', 'circle-radius', 12);
      map.setPaintProperty('floq-points', 'circle-opacity', 0.95);
      map.setPaintProperty('floq-points', 'circle-stroke-width', 2);
    };

    // Friends hover effects
    const handleFriendsEnter = () => {
      if (!map.getLayer('friends-pins')) return;
      map.getCanvas().style.cursor = 'pointer';
      map.setPaintProperty('friends-pins', 'circle-radius', 10); // Slightly bigger on hover
      map.setPaintProperty('friends-pins', 'circle-opacity', 1);
      map.setPaintProperty('friends-pins', 'circle-stroke-width', 3);
    };

    const handleFriendsLeave = () => {
      if (!map.getLayer('friends-pins')) return;
      map.getCanvas().style.cursor = '';
      map.setPaintProperty('friends-pins', 'circle-radius', 8);
      map.setPaintProperty('friends-pins', 'circle-opacity', 0.9);
      map.setPaintProperty('friends-pins', 'circle-stroke-width', 2);
    };

    // Friends click handler (for future profile/chat integration)
    const handleFriendsClick = (e: mapboxgl.MapMouseEvent) => {
      if (!map.getLayer('friends-pins')) return;
      
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['friends-pins']
      });

      if (features.length > 0) {
        const friend = features[0];
        console.log('🫂 Friend clicked:', friend.properties);
        // TODO: Open friend profile or start chat
        // This could trigger a modal, navigation, or other interaction
      }
    };

    // Plan hover effects
    const handlePlansEnter = () => {
      if (!map.getLayer('plan-points') && !map.getLayer('plan-clusters')) return;
      map.getCanvas().style.cursor = 'pointer';
      if (map.getLayer('plan-points')) {
        map.setPaintProperty('plan-points', 'circle-radius', [
          'case',
          ['>', ['get', 'stop_count'], 5], 18,
          ['>', ['get', 'stop_count'], 3], 16,
          ['>', ['get', 'stop_count'], 1], 14,
          12
        ]);
        map.setPaintProperty('plan-points', 'circle-opacity', 1);
      }
    };

    const handlePlansLeave = () => {
      if (!map.getLayer('plan-points') && !map.getLayer('plan-clusters')) return;
      map.getCanvas().style.cursor = '';
      if (map.getLayer('plan-points')) {
        map.setPaintProperty('plan-points', 'circle-radius', [
          'case',
          ['>', ['get', 'stop_count'], 5], 16,
          ['>', ['get', 'stop_count'], 3], 14,
          ['>', ['get', 'stop_count'], 1], 12,
          10
        ]);
        map.setPaintProperty('plan-points', 'circle-opacity', 0.9);
      }
    };

    // Plan click handler
    const handlePlansClick = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['plan-points', 'plan-clusters']
      });

      if (features.length > 0) {
        const plan = features[0];
        console.log('📋 Plan clicked:', plan.properties);
        // TODO: Open plan details or start plan execution
        // This could trigger plan modal, navigation, or execution flow
      }
    };

    map.on('click', 'floq-clusters', handleClusterClickGuarded);
    map.on('mouseenter' as any, 'floq-clusters', handleClusterEnter);
    map.on('mouseleave' as any, 'floq-clusters', handleClusterLeave);
    map.on('mouseenter' as any, 'floq-points', handleFloqEnter);
    map.on('mouseleave' as any, 'floq-points', handleFloqLeave);
    
    // Friends event listeners
    map.on('click', 'friends-pins', handleFriendsClick);
    map.on('mouseenter' as any, 'friends-pins', handleFriendsEnter);
    map.on('mouseleave' as any, 'friends-pins', handleFriendsLeave);
    
    // Plan event listeners
    map.on('click', 'plan-points', handlePlansClick);
    map.on('click', 'plan-clusters', handlePlansClick);
    map.on('mouseenter' as any, 'plan-points', handlePlansEnter);
    map.on('mouseleave' as any, 'plan-points', handlePlansLeave);
    map.on('mouseenter' as any, 'plan-clusters', handlePlansEnter);
    map.on('mouseleave' as any, 'plan-clusters', handlePlansLeave);

    return () => {
      map.off('click', 'floq-clusters', handleClusterClickGuarded);
      map.off('mouseenter' as any, 'floq-clusters', handleClusterEnter);
      map.off('mouseleave' as any, 'floq-clusters', handleClusterLeave);
      map.off('mouseenter' as any, 'floq-points', handleFloqEnter);
      map.off('mouseleave' as any, 'floq-points', handleFloqLeave);
      
      // Cleanup friends event listeners
      map.off('click', 'friends-pins', handleFriendsClick);
      map.off('mouseenter' as any, 'friends-pins', handleFriendsEnter);
      map.off('mouseleave' as any, 'friends-pins', handleFriendsLeave);
      
      // Cleanup plan event listeners
      map.off('click', 'plan-points', handlePlansClick);
      map.off('click', 'plan-clusters', handlePlansClick);
      map.off('mouseenter' as any, 'plan-points', handlePlansEnter);
      map.off('mouseleave' as any, 'plan-points', handlePlansLeave);
      map.off('mouseenter' as any, 'plan-clusters', handlePlansEnter);
      map.off('mouseleave' as any, 'plan-clusters', handlePlansLeave);
    };
  }, [map, layersInitialized.current, handleClusterClick]);

  // Note: Floq and plan data updates are now handled by dedicated source hooks

  return {
    layersReady: layersInitialized.current
  };
}
