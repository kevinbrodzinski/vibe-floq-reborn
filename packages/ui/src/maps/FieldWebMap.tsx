
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
// Import the worker for Vite
import MapboxWorker from 'mapbox-gl/dist/mapbox-gl-csp-worker.js?worker';
import { supabase } from '@/integrations/supabase/client';
import { setMapInstance } from '@/lib/geo/project';

// Configure the worker before any map initialization
(mapboxgl as any).workerClass = MapboxWorker;

interface Props {
  onRegionChange: (b: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
    zoom: number;
  }) => void;
  children?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  TOKEN RESOLVER                                                    */
/* ------------------------------------------------------------------ */
async function getFieldMapboxToken(): Promise<{ token: string; source: string }> {
  /* 1 — edge function (FLOQ_PROD_2025) */
  try {
    const { data, error } = await supabase.functions.invoke('mapbox-token');
    if (data?.token && !error) {
      return { token: data.token, source: 'edge-function' };
    }
  } catch {/* swallow */ }

  /* 2 — env */
  const envToken =
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ??
    (typeof process !== 'undefined' ? process.env.MAPBOX_ACCESS_TOKEN : undefined);
  if (envToken) return { token: envToken, source: 'env' };

  /* 3 — public fallback */
  return {
    token: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
    source: 'fallback'
  };
}

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                         */
/* ------------------------------------------------------------------ */
export const FieldWebMap: React.FC<Props> = ({ onRegionChange, children }) => {
  const container = useRef<HTMLDivElement>(null);
  const mapRef     = useRef<mapboxgl.Map | null>(null);

  const [tokenStatus, setTokenStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tokenSource, setTokenSource] = useState<string>('');

  /* Mount map ONCE -------------------------------------------------- */
  useEffect(() => {
    if (!container.current || mapRef.current) return;              // guard

    const mount = async () => {
      try {
        const { token, source } = await getFieldMapboxToken();
        setTokenSource(source);
        mapboxgl.accessToken = token;

        console.log('[FieldWebMap] Initializing map with token from:', source);

        const map = new mapboxgl.Map({
          container : container.current!,
          style     : 'mapbox://styles/mapbox/dark-v11',
          center    : [-118.24, 34.05],
          zoom      : 11
        });

        mapRef.current = map;

        /* style & tiles ready ---- */
        map.once('load', () => {
          console.log('[FieldWebMap] Map loaded successfully');
          setMapInstance(map);
          setTokenStatus('ready');
        });

        /* basic controls ---------- */
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        const handleMoveEnd = () => {
          const b = map.getBounds();
          onRegionChange({
            minLat: b.getSouth(),
            minLng: b.getWest(),
            maxLat: b.getNorth(),
            maxLng: b.getEast(),
            zoom  : map.getZoom()
          });
        };
        map.on('moveend', handleMoveEnd);
        handleMoveEnd(); // fire once immediately
      } catch (err) {
        console.error('[FieldWebMap] init failed', err);
        setTokenStatus('error');
      }
    };

    mount();

    return () => {
      if (mapRef.current) {
        try {
          setMapInstance(null);
          mapRef.current.remove();
        } finally {
          mapRef.current = null;
          setTokenStatus('loading');
        }
      }
    };
  }, []); // <- NO deps – runs once

  /* ---------------------------------------------------------------- */
  /* RENDER                                                           */
  /* ---------------------------------------------------------------- */
  if (tokenStatus === 'loading') {
    return (
      <div className="absolute inset-0 grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <span className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" />
          <span className="text-sm text-muted-foreground">Loading field map…</span>
        </div>
      </div>
    );
  }

  if (tokenStatus === 'error') {
    return (
      <div className="absolute inset-0 grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm text-destructive">Failed to load field map</span>
          <button
            className="text-xs underline decoration-dotted"
            onClick={() => window.location.reload()}
          >
            reload
          </button>
        </div>
      </div>
    );
  }

  /* ready ----------------------------------------------------------- */
  return (
    <div className="absolute inset-0">
      <div ref={container} className="absolute inset-0" />
      {children}
      {import.meta.env.DEV && (
        <div className="absolute top-2 left-2 rounded bg-background/80 px-2 py-1 text-xs font-mono">
          token: {tokenSource}
        </div>
      )}
    </div>
  );
};
