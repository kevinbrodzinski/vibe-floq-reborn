import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { usePeopleSource } from '@/map/layers/usePeopleSource';
import { selfLayer } from '@/map/layers/selfLayer';
import type { Person } from '@/map/layers/usePeopleSource';

/**
 * useMapLayers - Unified layer management for Mapbox maps
 * Coordinates people source, self layer, and floq clustering
 * Preserves all existing functionality including cluster zoom
 */

interface UseMapLayersProps {
  map: mapboxgl.Map | null;
  people: Person[];
  floqs: any[];
  onClusterClick?: (clusterId: number, coordinates: [number, number]) => void;
}

export function useMapLayers({ 
  map, 
  people, 
  floqs,
  onClusterClick 
}: UseMapLayersProps) {
  const layersInitialized = useRef(false);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Initialize people source (includes self feature)
  usePeopleSource(map, people);

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

      // Add floqs source with clustering (preserve existing functionality)
      if (!map.getSource('floqs')) {
        map.addSource('floqs', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          },
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
      }

      // Add self layer (blue "YOU" pin) - preserve existing functionality
      if (!map.getLayer('me-pin')) {
        map.addLayer(selfLayer);
      }

      // Add cluster layers (preserve all existing styling and behavior)
      if (!map.getLayer('floq-clusters')) {
        map.addLayer({
          id: 'floq-clusters',
          type: 'circle',
          source: 'floqs',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'case',
              ['>', ['get', 'social'], 0], '#059669',
              ['>', ['get', 'hype'], 0], '#DC2626',
              ['>', ['get', 'curious'], 0], '#7C3AED',
              ['>', ['get', 'chill'], 0], '#2563EB',
              ['>', ['get', 'solo'], 0], '#0891B2',
              ['>', ['get', 'romantic'], 0], '#EC4899',
              ['>', ['get', 'weird'], 0], '#F59E0B',
              ['>', ['get', 'down'], 0], '#6B7280',
              ['>', ['get', 'flowing'], 0], '#10B981',
              ['>', ['get', 'open'], 0], '#84CC16',
              '#4B5563'
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20, 2,
              30, 5,
              40, 10,
              50
            ],
            'circle-opacity': 0.9,
            'circle-stroke-width': 3,
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-opacity': 1
          }
        });
      }

      // Add cluster count labels (preserve existing functionality)
      if (!map.getLayer('floq-cluster-count')) {
        map.addLayer({
          id: 'floq-cluster-count',
          type: 'symbol',
          source: 'floqs',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count'],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 16,
            'text-allow-overlap': true
          },
          paint: {
            'text-color': '#FFFFFF',
            'text-halo-color': '#000000',
            'text-halo-width': 2
          }
        });
      }

      // Add individual floq points (preserve existing functionality)
      if (!map.getLayer('floq-points')) {
        map.addLayer({
          id: 'floq-points',
          type: 'circle',
          source: 'floqs',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'case',
              ['==', ['get', 'vibe'], 'social'], '#059669',
              ['==', ['get', 'vibe'], 'hype'], '#DC2626',
              ['==', ['get', 'vibe'], 'curious'], '#7C3AED',
              ['==', ['get', 'vibe'], 'chill'], '#2563EB',
              ['==', ['get', 'vibe'], 'solo'], '#0891B2',
              ['==', ['get', 'vibe'], 'romantic'], '#EC4899',
              ['==', ['get', 'vibe'], 'weird'], '#F59E0B',
              ['==', ['get', 'vibe'], 'down'], '#6B7280',
              ['==', ['get', 'vibe'], 'flowing'], '#10B981',
              ['==', ['get', 'vibe'], 'open'], '#84CC16',
              '#4B5563'
            ],
            'circle-radius': 12,
            'circle-opacity': 0.95,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-opacity': 1
          }
        });
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

    map.on('click', 'floq-clusters', handleClusterClickGuarded);
    map.on('mouseenter' as any, 'floq-clusters', handleClusterEnter);
    map.on('mouseleave' as any, 'floq-clusters', handleClusterLeave);
    map.on('mouseenter' as any, 'floq-points', handleFloqEnter);
    map.on('mouseleave' as any, 'floq-points', handleFloqLeave);

    return () => {
      map.off('click', 'floq-clusters', handleClusterClickGuarded);
      map.off('mouseenter' as any, 'floq-clusters', handleClusterEnter);
      map.off('mouseleave' as any, 'floq-clusters', handleClusterLeave);
      map.off('mouseenter' as any, 'floq-points', handleFloqEnter);
      map.off('mouseleave' as any, 'floq-points', handleFloqLeave);
    };
  }, [map, layersInitialized.current, handleClusterClick]);

  // Update floqs data with debouncing for large datasets
  useEffect(() => {
    if (!map || !layersInitialized.current) return;

    const floqsGeoJSON = {
      type: 'FeatureCollection' as const,
      features: floqs.map(floq => ({
        type: 'Feature' as const,
        properties: {
          id: floq.id,
          title: floq.title,
          vibe: floq.primary_vibe,
          participants: floq.participant_count || 0,
          distance_meters: floq.distance_meters,
          friend_name: floq.friend_name,
          address: floq.address
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [floq.lng || 0, floq.lat || 0]
        }
      }))
    };

    const source = map.getSource('floqs') as mapboxgl.GeoJSONSource;
    if (source) {
      // 🔍 LARGE DATASET CHECK: Log if data is large enough to cause delays
      const featureCount = floqsGeoJSON.features.length;
      if (featureCount > 100) {
        console.warn(`🐌 Large floqs dataset: ${featureCount} features - may cause WebWorker delay`);
      }
      
      // For very large datasets, consider batching
      if (featureCount > 500) {
        console.log('📦 Batching large dataset...');
        // Set empty first, then data on next tick to avoid blocking
        source.setData({ type: 'FeatureCollection', features: [] });
        setTimeout(() => source.setData(floqsGeoJSON), 0);
      } else {
        source.setData(floqsGeoJSON);
      }
    }
  }, [map, floqs, layersInitialized.current]);

  return {
    layersReady: layersInitialized.current
  };
}
