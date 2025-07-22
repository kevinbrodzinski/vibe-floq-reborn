import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/integrations/supabase/client';
import { setMapInstance } from '@/lib/geo/project';

/** one-shot token fetch — runs the first time we mount */
const loadTokenOnce = (() => {
  let done = false;
  return async () => {
    if (done) return;
    try {
      const { data } = await supabase.functions.invoke('mapbox-token');
      if (data?.token) mapboxgl.accessToken = data.token;
      else console.warn('[MAP] no token returned, Mapbox will scream');
    } catch (e) {
      console.warn('[MAP] token fetch failed', e);
    }
    done = true;
  };
})();

interface Props {
  onRegionChange: (b: {
    minLat: number; minLng: number;
    maxLat: number; maxLng: number;
    zoom:    number;
  }) => void;
  children?: React.ReactNode;
}

export const WebMap: React.FC<Props> = ({ onRegionChange, children }) => {
  const container = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<mapboxgl.Map | null>(null);

  /* create map once */
  useEffect(() => {
    if (!container.current || mapRef.current) return;

    loadTokenOnce().then(() => {
      const map = new mapboxgl.Map({
        container: container.current!,
        style:     'mapbox://styles/mapbox/dark-v11',
        center:    [-118.24, 34.05],
        zoom:      11,
      });
      mapRef.current = map;

      /* 👉  register for projection AFTER style loads */
      map.once('load', () => setMapInstance(map));

      /* viewport → React */
      const onMove = () => {
        const b = map.getBounds();
        onRegionChange({
          minLat: b.getSouth(), minLng: b.getWest(),
          maxLat: b.getNorth(), maxLng: b.getEast(),
          zoom:   map.getZoom(),
        });
      };
      map.on('moveend', onMove);

      /* cleanup – prevents _cancelResize crash */
      return () => {
        setMapInstance(null);
        map.off('moveend', onMove);
        map.remove();
        mapRef.current = null;
      };
    });
  }, [onRegionChange]);

  /* *** PERFECTLY SAFE LAYOUT – fills everything below header *** */
  return (
    <div className="absolute inset-0">
      <div ref={container} className="absolute inset-0" />
      {children /* FieldCanvas overlay */}
    </div>
  );
};