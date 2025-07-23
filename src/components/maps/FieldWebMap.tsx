
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { setMapInstance } from '@/lib/geo/project';
import { registerMapboxWorker } from '@/lib/geo/registerMapboxWorker';
import { getMapboxToken } from '@/lib/geo/getMapboxToken';

// Configure the worker before any map initialization
registerMapboxWorker();

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

export const FieldWebMap: React.FC<Props> = ({ onRegionChange, children }) => {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tokenSource, setTokenSource] = useState<string>('');

  useEffect(() => {
    if (!container.current || mapRef.current) return;

    const mount = async () => {
      try {
        const { token, source } = await getMapboxToken();
        setTokenSource(source);
        mapboxgl.accessToken = token;

        if (import.meta.env.DEV) {
          console.log('[FieldWebMap] Initializing map with token from:', source);
        }

        const map = new mapboxgl.Map({
          container: container.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [-118.24, 34.05],
          zoom: 11
        });

        mapRef.current = map;

        /* basic controls ---------- */
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        const handleMoveEnd = () => {
          const b = map.getBounds();
          onRegionChange({
            minLat: b.getSouth(),
            minLng: b.getWest(),
            maxLat: b.getNorth(),
            maxLng: b.getEast(),
            zoom: map.getZoom()
          });
        };

        /* style & tiles ready ---- */
        map.once('load', () => {
          if (import.meta.env.DEV) {
            console.log('[FieldWebMap] Map loaded successfully');
          }
          setMapInstance(map);
          setTokenStatus('ready');
          
          // Fire once immediately after load
          handleMoveEnd();
        });

        map.on('moveend', handleMoveEnd);
      } catch (err) {
        console.error('[FieldWebMap] init failed', err);
        setTokenStatus('error');
      }
    };

    mount();

    return () => {
      if (mapRef.current) {
        try {
          const map = mapRef.current;
          map.off('moveend', () => {});
          setMapInstance(null);
          map.remove();
        } finally {
          mapRef.current = null;
          setTokenStatus('loading');
        }
      }
    };
  }, []);

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
            onClick={() => {
              setTokenStatus('loading');
              if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
              }
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

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
