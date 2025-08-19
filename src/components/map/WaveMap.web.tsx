import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getMapboxToken } from '@/lib/geo/getMapboxToken';

export type WaveMarker = { id: string; lat: number; lng: number; size: number; friends: number };

export default function WaveMapWeb({ lat, lng, markers }: { lat: number; lng: number; markers: WaveMarker[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [tokenReady, setTokenReady] = useState(false);

  // Initialize Mapbox token using existing system
  useEffect(() => {
    getMapboxToken().then(({ token }) => {
      mapboxgl.accessToken = token;
      setTokenReady(true);
    }).catch(err => {
      console.error('Failed to get Mapbox token:', err);
    });
  }, []);

  // init map once token is ready
  useEffect(() => {
    if (!ref.current || mapRef.current || !tokenReady) return;
    
    mapRef.current = new mapboxgl.Map({
      container: ref.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: 12.5,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }));
  }, [lat, lng, tokenReady]);

  // update data layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = 'waves';
    const layerId = 'waves-circles';

    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: markers.map((m) => ({
        type: 'Feature',
        properties: { id: m.id, size: m.size, friends: m.friends },
        geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
      })),
    };

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(fc);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: fc });
      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'size'], 3, 6, 20, 22],
          'circle-color': [
            'case',
            ['>=', ['get', 'friends'], 3], '#8bd5ff',
            ['>=', ['get', 'friends'], 1], '#97f3a1',
            '#b0b0b0',
          ],
          'circle-opacity': 0.7,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#111',
        },
      });

      // simple cursor + popup
      map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
      map.on('click', layerId, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const { size, friends } = f.properties as any;
        const [x, y] = e.lngLat.toArray();
        new mapboxgl.Popup({ closeButton: true })
          .setLngLat([x, y])
          .setHTML(`<div style="font: 12px system-ui;">Wave size <b>${size}</b><br/>Friends here <b>${friends}</b></div>`)
          .addTo(map);
      });
    }
  }, [markers]);

  if (!tokenReady) {
    return (
      <div className="w-full h-full bg-muted rounded-xl flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return <div ref={ref} style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }} />;
}