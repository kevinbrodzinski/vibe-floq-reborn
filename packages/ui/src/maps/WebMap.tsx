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

  /* 1️⃣  fetch token once */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('mapbox-token');
        if (data?.token) mapboxgl.accessToken = data.token;
      } finally {
        /* even if token fetch fails we still attempt init – Mapbox will error visibly */
      }
    })();
  }, []);

  /* 2️⃣  init map */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style:     'mapbox://styles/mapbox/dark-v11',
      center:    [-118.24, 34.05],
      zoom:      11,
    });
    mapRef.current = map;

    /* ✅ bridge – register */
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

    /* cleanup – must unset ref to avoid _cancelResize crash */
    return () => {
      setMapInstance(null);
      map.off('moveend', handleMoveEnd);
      map.remove();                 // <- triggers Mapbox's own _cancelResize safely
      mapRef.current = null;
    };
  }, [onRegionChange]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* Mapbox injects its <canvas> here */}
      {children /* overlay (pixi canvas) */}
    </div>
  );
};