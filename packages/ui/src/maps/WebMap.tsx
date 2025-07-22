import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/integrations/supabase/client';
import { setMapInstance } from '@/lib/geo/project';

export const WebMap: React.FC<{
  onRegionChange: (b: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
    zoom: number;
  }) => void;
  children?: React.ReactNode;
}> = ({ onRegionChange, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);

  // ⬇️ ONE helper to fetch once (kept tiny to avoid any layout changes)
  const initToken = (() => {
    let done = false;
    return async () => {
      if (done) return;
      try {
        const { data } = await supabase.functions.invoke('mapbox-token');
        if (data?.token) mapboxgl.accessToken = data.token;
      } catch { /* silent – Mapbox will throw if truly missing */ }
      done = true;
    };
  })();

  /* init map */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    /* 1️⃣  guarantee token is set */
    initToken().then(() => {
      /* 2️⃣  build the map only after token attempt */

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style:     'mapbox://styles/mapbox/dark-v11',
        center:    [-118.24, 34.05],
        zoom:      11,
      });
      mapRef.current = map;

      /* register once */
      map.on('load', () => setMapInstance(map));

      /* viewport sync */
      const handleMoveEnd = () => {
        const b = map.getBounds();
        onRegionChange({
          minLat: b.getSouth(),
          minLng: b.getWest(),
          maxLat: b.getNorth(),
          maxLng: b.getEast(),
          zoom:   map.getZoom(),
        });
      };
      map.on('moveend', handleMoveEnd);

      /* cleanup – prevents "_cancelResize" crash */
      return () => {
        setMapInstance(null);
        map.off('moveend', handleMoveEnd);
        map.remove();
        mapRef.current = null;
      };
    });
  }, [onRegionChange]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* Mapbox injects its <canvas> here */}
      {children /* overlay (pixi canvas) */}
    </div>
  );
};