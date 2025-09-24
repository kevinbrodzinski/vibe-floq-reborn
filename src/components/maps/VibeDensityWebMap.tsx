import React, { useEffect, useRef, useState, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { getMapboxToken, clearMapboxTokenCache } from '@/lib/geo/getMapboxToken';
import { setMapInstance } from '@/lib/geo/project';

// Remove registerMapboxWorker() for Mapbox v3

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
export interface Bounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  zoom:   number;
}

interface Props {
  /** Toggle supplied by the wrapper. When `false` we return `null`.   */
  visible: boolean;
  onRegionChange: (b: Bounds) => void;
  children?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export const VibeDensityWebMap = memo(function VibeDensityWebMap ({
  visible,
  onRegionChange,
  children,
}: Props) {
  /* ░░░ Bail out early ░░░ */
  if (!visible) return null;

  const container = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);

  /* ────────────────────────────────────────────────────────── */
  /*  Mount ONCE                                               */
  /* ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!container.current || mapRef.current) return;

    let destroyed = false;

    (async () => {
      try {
        /* token */
        const { token } = await getMapboxToken();
        mapboxgl.accessToken = token;

        /* map - require location before creating */
        const map = new mapboxgl.Map({
          container: container.current,
          style:     'mapbox://styles/mapbox/dark-v11',
          center:    [0, 0], // Will be set when location is available
          zoom:      11,
        });
        mapRef.current = map;

        /* callback */
        const fireMove = () => {
          const b = map.getBounds();
          onRegionChange({
            minLat: b.getSouth(),
            minLng: b.getWest(),
            maxLat: b.getNorth(),
            maxLng: b.getEast(),
            zoom:   map.getZoom(),
          });
        };

        map.once('load', () => {
          if (destroyed) return;
          setMapInstance(map);
          setReady(true);
          fireMove();
          map.on('moveend', fireMove);
        });
      } catch (err) {
        console.error('[VibeDensityWebMap] init failed', err);
      }
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onRegionChange]);

  /* ────────────────────────────────────────────────────────── */
  /*  Render                                                   */
  /* ────────────────────────────────────────────────────────── */
  return (
    <div className="absolute inset-0">
      <div ref={container} className="absolute inset-0" />
      {ready && children /* children only after map is ready */}
    </div>
  );
});