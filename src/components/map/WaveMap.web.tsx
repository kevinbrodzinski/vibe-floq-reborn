import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getMapboxToken } from '@/lib/geo/getMapboxToken';

export type WaveMarker = { id: string; lat: number; lng: number; size: number; friends: number };

export default function WaveMapWeb({ lat, lng, markers, onSelect }: {
  lat: number; lng: number; markers: WaveMarker[]; onSelect?: (m: WaveMarker) => void;
}) {
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
        properties: { id: m.id, size: m.size, friends: m.friends, lat: m.lat, lng: m.lng },
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

      // cursor + selection
      map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
      map.on('click', layerId, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as any;
        const marker: WaveMarker = { 
          id: String(p.id), 
          size: Number(p.size), 
          friends: Number(p.friends), 
          lat: Number(p.lat), 
          lng: Number(p.lng) 
        };
        onSelect?.(marker);
      });
    }
  }, [markers, onSelect]);

  if (!tokenReady) {
    return (
      <div className="w-full h-full bg-muted rounded-xl flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return <div ref={ref} style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }} />;
}