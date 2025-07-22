import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  (process.env.MAPBOX_ACCESS_TOKEN as string);

export interface BaseMapProps {
  onRegionChange: (b: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
    zoom: number;
  }) => void;
  children?: React.ReactNode;
}

export const WebMap: React.FC<BaseMapProps> = ({
  onRegionChange,
  children,
}) => {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map>();

  useEffect(() => {
    if (!container.current) return;

    mapRef.current = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-118.24, 34.05], // LA
      zoom: 11,
    });

    mapRef.current.on('moveend', () => {
      const m = mapRef.current!;
      const b = m.getBounds();
      onRegionChange({
        minLat: b.getSouth(),
        minLng: b.getWest(),
        maxLat: b.getNorth(),
        maxLng: b.getEast(),
        zoom: m.getZoom(),
      });
    });

    return () => mapRef.current?.remove();
  }, []);

  return (
    <div ref={container} style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};