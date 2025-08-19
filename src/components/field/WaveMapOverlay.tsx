import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { getMapInstance } from '@/lib/geo/project';
import { useWavesNear } from '@/hooks/useWavesNear';

interface WaveMapOverlayProps {
  lat: number;
  lng: number;
  isVisible: boolean;
  onWaveClick?: (waveId: string, lat: number, lng: number) => void;
}

export const WaveMapOverlay: React.FC<WaveMapOverlayProps> = ({
  lat,
  lng,
  isVisible,
  onWaveClick
}) => {
  const { data: waves } = useWavesNear({ 
    lat, 
    lng, 
    friendsOnly: true,
    pollMs: 10000 
  });
  const layerAddedRef = useRef(false);

  useEffect(() => {
    const map = getMapInstance();
    if (!map || !isVisible) return;

    const sourceId = 'wave-clusters';
    const layerId = 'wave-clusters-layer';
    const labelLayerId = 'wave-clusters-labels';

    // Create GeoJSON from waves data
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: (waves ?? []).map(wave => ({
        type: 'Feature',
        properties: {
          id: wave.cluster_id,
          size: wave.size,
          friends: wave.friends_in_cluster,
          distance: wave.distance_m
        },
        geometry: {
          type: 'Point',
          coordinates: [wave.centroid_lng, wave.centroid_lat]
        }
      }))
    };

    // Add or update source
    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson
      });

      // Add circle layer for wave visualization
      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'size'],
            3, 8,   // size 3 → 8px radius
            10, 16, // size 10 → 16px radius
            20, 24  // size 20 → 24px radius
          ],
          'circle-color': [
            'case',
            ['>=', ['get', 'friends'], 3], '#3b82f6', // Blue for many friends
            ['>=', ['get', 'friends'], 1], '#10b981', // Green for some friends
            '#6b7280' // Gray for no friends
          ],
          'circle-opacity': 0.7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.8
        }
      });

      // Add text labels for friend count
      map.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: sourceId,
        layout: {
          'text-field': ['get', 'friends'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        }
      });

      // Add click handler
      map.on('click', layerId, (e) => {
        const feature = e.features?.[0];
        if (feature && feature.properties) {
          const { id, size, friends } = feature.properties;
          const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
          
          // Show popup with wave info
          new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
            .setLngLat([lng, lat])
            .setHTML(`
              <div style="font-family: system-ui; padding: 8px;">
                <div style="font-weight: bold; margin-bottom: 4px;">Wave Activity</div>
                <div style="font-size: 12px; color: #666;">
                  <div>Size: <strong>${size}</strong> people</div>
                  <div>Friends: <strong>${friends}</strong></div>
                  <div style="margin-top: 8px;">
                    <button onclick="window.createFloqFromWave?.('${id}', ${lat}, ${lng})" 
                            style="background: #3b82f6; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">
                      Start Floq Here
                    </button>
                  </div>
                </div>
              </div>
            `)
            .addTo(map);

          // Also trigger the callback
          onWaveClick?.(id, lat, lng);
        }
      });

      // Change cursor on hover
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });

      layerAddedRef.current = true;
    }

    // Cleanup function
    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getLayer(labelLayerId)) {
        map.removeLayer(labelLayerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
      layerAddedRef.current = false;
    };
  }, [waves, isVisible, onWaveClick]);

  // Make wave creation available globally for popup buttons
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).createFloqFromWave = async (waveId: string, lat: number, lng: number) => {
        const wave = waves?.find(w => w.cluster_id === waveId);
        if (wave) {
          await handleCreateFromWave(wave);
        }
      };
    }
  }, [waves, handleCreateFromWave]);

  return null; // This component only adds map layers, no DOM elements
};