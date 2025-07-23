
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { setMapInstance } from '@/lib/geo/project';

interface Props {
  onRegionChange: (b: {
    minLat: number; minLng: number;
    maxLat: number; maxLng: number;
    zoom: number;
  }) => void;
  children?: React.ReactNode;
}

const getFieldMapboxToken = async (): Promise<{ token: string; source: string }> => {
  // First try: Edge function with FLOQ_PROD_2025 token
  try {
    const { data, error } = await supabase.functions.invoke('mapbox-token');
    if (data?.token && !error) {
      console.log('[FieldWebMap] Using FLOQ_PROD_2025 token from edge function');
      return { token: data.token, source: 'edge-function' };
    }
    console.warn('[FieldWebMap] Edge function failed:', error);
  } catch (e) {
    console.warn('[FieldWebMap] Edge function unavailable:', e);
  }

  // Second try: Environment variable MAPBOX_ACCESS_TOKEN
  const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 
                   (typeof process !== 'undefined' ? process.env.MAPBOX_ACCESS_TOKEN : null);
  
  if (envToken) {
    console.log('[FieldWebMap] Using MAPBOX_ACCESS_TOKEN from environment');
    return { token: envToken, source: 'environment' };
  }

  // Final fallback: Public token
  console.warn('[FieldWebMap] Using fallback public token');
  return { 
    token: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
    source: 'fallback'
  };
};

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

        const map = new mapboxgl.Map({
          container : container.current!,
          style     : 'mapbox://styles/mapbox/dark-v11',
          center    : [-118.24, 34.05],
          zoom      : 11
        });

        mapRef.current = map;

        /* style & tiles ready ---- */
        map.once('load', () => {
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
