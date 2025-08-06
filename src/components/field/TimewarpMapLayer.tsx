import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useTimewarp } from '@/hooks/useTimewarp';
import { useTimewarpDrawer } from '@/contexts/TimewarpDrawerContext';

interface TimewarpMapLayerProps {
  map: mapboxgl.Map | null;
}

export const TimewarpMapLayer: React.FC<TimewarpMapLayerProps> = ({ map }) => {
  const { timewarpState } = useTimewarpDrawer();
  const { currentPoint, trailPoints, isActive } = useTimewarp();
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Initialize timewarp marker and layers
  useEffect(() => {
    if (!map || !isActive) return;

    // Create animated marker for current position
    const marker = new mapboxgl.Marker({
      color: '#FF6B6B', // Red color for timewarp marker
      scale: 1.5,
    });
    markerRef.current = marker;

    // Add trail source and layer
    if (!map.getSource('timewarp-trail')) {
      map.addSource('timewarp-trail', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [],
          },
        },
      });

      map.addLayer({
        id: 'timewarp-trail',
        type: 'line',
        source: 'timewarp-trail',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#FF6B6B',
          'line-width': 4,
          'line-opacity': 0.8,
          'line-gradient': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0, 'rgba(255, 107, 107, 0.1)',
            1, 'rgba(255, 107, 107, 0.8)'
          ],
        },
      });
    }

    // Add venue stops source and layer
    if (!map.getSource('timewarp-venues')) {
      map.addSource('timewarp-venues', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.addLayer({
        id: 'timewarp-venues',
        type: 'circle',
        source: 'timewarp-venues',
        paint: {
          'circle-color': '#8B5CF6',
          'circle-radius': 8,
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.addLayer({
        id: 'timewarp-venue-labels',
        type: 'symbol',
        source: 'timewarp-venues',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-offset': [0, -2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      });
    }

    return () => {
      // Cleanup marker
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }

      // Cleanup popup
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }

      // Remove layers and sources
      if (map.getLayer('timewarp-trail')) {
        map.removeLayer('timewarp-trail');
      }
      if (map.getLayer('timewarp-venues')) {
        map.removeLayer('timewarp-venues');
      }
      if (map.getLayer('timewarp-venue-labels')) {
        map.removeLayer('timewarp-venue-labels');
      }
      if (map.getSource('timewarp-trail')) {
        map.removeSource('timewarp-trail');
      }
      if (map.getSource('timewarp-venues')) {
        map.removeSource('timewarp-venues');
      }
    };
  }, [map, isActive]);

  // Update marker position and trail
  useEffect(() => {
    if (!map || !isActive || !currentPoint || !markerRef.current) return;

    const marker = markerRef.current;
    const lngLat = new mapboxgl.LngLat(currentPoint.lng, currentPoint.lat);

    // Update marker position
    marker.setLngLat(lngLat).addTo(map);

    // Update trail
    const trailSource = map.getSource('timewarp-trail') as mapboxgl.GeoJSONSource;
    if (trailSource && trailPoints.length > 1) {
      const coordinates = trailPoints.map(point => [point.lng, point.lat]);
      
      trailSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      });
    }

    // Update venue stops
    const venueSource = map.getSource('timewarp-venues') as mapboxgl.GeoJSONSource;
    if (venueSource) {
      const venueFeatures = trailPoints
        .filter(point => point.venue_id)
        .map(point => ({
          type: 'Feature' as const,
          properties: {
            venue_id: point.venue_id,
            name: `Venue Stop`,
            timestamp: point.captured_at,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [point.lng, point.lat],
          },
        }));

      venueSource.setData({
        type: 'FeatureCollection',
        features: venueFeatures,
      });
    }

    // Center map on current position (optional - can be disabled for user control)
    if (timewarpState.isPlaying) {
      map.easeTo({
        center: lngLat,
        duration: 100, // Quick smooth movement
      });
    }

  }, [map, isActive, currentPoint, trailPoints, timewarpState.isPlaying]);

  // Hide/show other map layers during timewarp
  useEffect(() => {
    if (!map) return;

    const layersToHide = [
      'floq-clusters',
      'floq-cluster-count', 
      'floq-points',
      // Add other layer IDs you want to hide during timewarp
    ];

    layersToHide.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          'visibility',
          isActive ? 'none' : 'visible'
        );
      }
    });

    // Hide user location layer during timewarp
    if (map.getLayer('user-location')) {
      map.setLayoutProperty(
        'user-location',
        'visibility',
        isActive ? 'none' : 'visible'
      );
    }

  }, [map, isActive]);

  // Add venue popup on click
  useEffect(() => {
    if (!map || !isActive) return;

    const handleVenueClick = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['timewarp-venues']
      });

      if (features.length > 0) {
        const feature = features[0];
        const coordinates = (feature.geometry as any).coordinates.slice();
        const properties = feature.properties;

        // Create popup
        if (popupRef.current) {
          popupRef.current.remove();
        }

        const popup = new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`
            <div class="p-3">
              <div class="font-medium text-sm mb-1">Venue Stop</div>
              <div class="text-xs text-gray-600">
                ${new Date(properties?.timestamp).toLocaleString()}
              </div>
            </div>
          `)
          .addTo(map);

        popupRef.current = popup;
      }
    };

    map.on('click', 'timewarp-venues', handleVenueClick);

    return () => {
      map.off('click', 'timewarp-venues', handleVenueClick);
    };
  }, [map, isActive]);

  return null; // This component doesn't render anything directly
};