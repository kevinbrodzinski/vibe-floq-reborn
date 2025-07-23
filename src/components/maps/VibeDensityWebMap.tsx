
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
    minLat: number; minLng: number;
    maxLat: number; maxLng: number;
    zoom: number;
  }) => void;
  children?: React.ReactNode;
}

export const VibeDensityWebMap: React.FC<Props> = ({ onRegionChange, children }) => {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const moveRef = useRef<(e?: any) => void>();
  const errorRef = useRef<(e: any) => void>();
  const [status, setStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [errMsg, setErrMsg] = useState<string>();

  const initializeMap = async () => {
    if (!container.current || mapRef.current) return;

    let destroyed = false;

    try {
      /* ① ─ token ----------------------------------------------------------------- */
      const { token, source } = await getMapboxToken();
      mapboxgl.accessToken = token;
      import.meta.env.DEV && console.log('[VDWebMap] token from', source);

      /* ② ─ container size check ------------------------------------------------- */
      await new Promise(r => requestAnimationFrame(r));
      const { width, height } = container.current!.getBoundingClientRect();
      if (!width || !height) throw new Error('Map container has no dimensions');

      /* ③ ─ map ------------------------------------------------------------------- */
      const map = new mapboxgl.Map({
        container : container.current!,
        style     : 'mapbox://styles/mapbox/dark-v11',
        center    : [-118.24, 34.05],
        zoom      : 11,
        attributionControl: false
      });
      mapRef.current = map;

      /* ④ ─ event handlers with refs for proper cleanup -------------------------- */
      errorRef.current = (e: any) => {
        console.error('[VDWebMap] mapbox-error ➜', e.error?.message || e);
        if (!destroyed) { setStatus('error'); setErrMsg(e.error?.message); }
      };

      moveRef.current = () => {
        const b = map.getBounds();
        onRegionChange({
          minLat: b.getSouth(), minLng: b.getWest(),
          maxLat: b.getNorth(), maxLng: b.getEast(),
          zoom  : map.getZoom()
        });
      };

      map.on('error', errorRef.current);
      map.on('styleimagemissing', e =>
        console.warn('[VDWebMap] missing sprite', e.id)
      );

      /* ⑤ ─ load ------------------------------------------------------------------ */
      await new Promise<void>((res, rej) => {
        const t = setTimeout(() => rej(new Error('Style load timeout')), 10_000);
        map.once('load', () => { 
          clearTimeout(t); 
          res(); 
        });
      });

      if (destroyed) return;
      
      setMapInstance(map);
      moveRef.current(); // Fire initial callback
      map.on('moveend', moveRef.current);
      setStatus('ready');

    } catch (e: any) {
      console.error('[VDWebMap] init failed', e);
      if (!destroyed) { setStatus('error'); setErrMsg(e.message); }
    }

    return () => { destroyed = true; };
  };

  useEffect(() => {
    initializeMap();

    return () => {
      clearTimeout(timeoutRef.current);
      
      if (mapRef.current) {
        if (moveRef.current) mapRef.current.off('moveend', moveRef.current);
        if (errorRef.current) mapRef.current.off('error', errorRef.current);
        setMapInstance(null);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="absolute inset-0 grid place-items-center bg-background/80 z-50">
        <div className="flex flex-col items-center gap-2">
          <span className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <span className="text-sm text-muted-foreground">Loading vibe map…</span>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="absolute inset-0 grid place-items-center bg-background/80 z-50">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-sm text-destructive">Map error</span>
          {errMsg && <span className="text-xs text-muted-foreground">{errMsg}</span>}
          <button
            className="text-xs underline decoration-dotted mt-1"
            onClick={() => {
              setStatus('loading');
              setErrMsg('');
              initializeMap();
            }}
          >
            try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div 
        ref={container} 
        className="absolute inset-0" 
        style={{ minHeight: '300px', minWidth: '300px' }}
      />
      {children}
      
      {/* Debug info in development */}
      {import.meta.env.DEV && (
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm border rounded px-2 py-1 text-xs font-mono">
          <div>Status: {status}</div>
          {errMsg && <div className="text-destructive">Error: {errMsg}</div>}
        </div>
      )}
    </div>
  );
};
