
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
  console.log('[VibeDensityWebMap] Component rendering...');
  
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const moveRef = useRef<(e?: any) => void>();
  const errorRef = useRef<(e: any) => void>();
  const [status, setStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [errMsg, setErrMsg] = useState<string>();

  const initializeMap = async () => {
    console.log('[VibeDensityWebMap] Starting map initialization...');
    
    if (!container.current || mapRef.current) {
      console.log('[VibeDensityWebMap] Container or map already exists, skipping init');
      return;
    }

    let destroyed = false;

    try {
      /* ① ─ token ----------------------------------------------------------------- */
      console.log('[VibeDensityWebMap] Getting Mapbox token...');
      const { token, source } = await getMapboxToken();
      mapboxgl.accessToken = token;
      console.log('[VDWebMap] token from', source);

      /* ② ─ container size check ------------------------------------------------- */
      await new Promise(r => requestAnimationFrame(r));
      
      if (!container.current) {
        throw new Error('Container ref lost during initialization');
      }
      
      const { width, height } = container.current.getBoundingClientRect();
      console.log('[VibeDensityWebMap] Container size:', width, height);
      
      if (!width || !height) {
        throw new Error(`Map container has no dimensions: ${width}x${height}`);
      }

      /* ③ ─ map ------------------------------------------------------------------- */
      console.log('[VibeDensityWebMap] Creating Mapbox map...');
      const map = new mapboxgl.Map({
        container : container.current,
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
        if (!map) return;
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
      console.log('[VibeDensityWebMap] Waiting for map to load...');
      await new Promise<void>((res, rej) => {
        const t = setTimeout(() => rej(new Error('Style load timeout')), 15_000); // Increased timeout
        map.once('load', () => { 
          console.log('[VibeDensityWebMap] Map loaded successfully!');
          clearTimeout(t); 
          res(); 
        });
      });

      if (destroyed) {
        console.log('[VibeDensityWebMap] Component destroyed during load, cleaning up');
        return;
      }
      
      setMapInstance(map);
      moveRef.current(); // Fire initial callback
      map.on('moveend', moveRef.current);
      setStatus('ready');
      console.log('[VibeDensityWebMap] Map initialization complete!');

    } catch (e: any) {
      console.error('[VDWebMap] init failed', e);
      if (!destroyed) { setStatus('error'); setErrMsg(e.message); }
    }

    return () => { 
      console.log('[VibeDensityWebMap] Cleanup function called');
      destroyed = true; 
    };
  };

  useEffect(() => {
    console.log('[VibeDensityWebMap] useEffect running...');
    initializeMap();

    return () => {
      console.log('[VibeDensityWebMap] Cleanup effect running...');
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
    console.log('[VibeDensityWebMap] Rendering loading state');
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
    console.log('[VibeDensityWebMap] Rendering error state:', errMsg);
    return (
      <div className="absolute inset-0 grid place-items-center bg-background/80 z-50">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-sm text-destructive">Map error</span>
          {errMsg && <span className="text-xs text-muted-foreground">{errMsg}</span>}
          <button
            className="text-xs underline decoration-dotted mt-1"
            onClick={() => {
              console.log('[VibeDensityWebMap] Retry button clicked');
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

  console.log('[VibeDensityWebMap] Rendering ready state with map container');
  return (
    <div className="absolute inset-0">
      <div 
        ref={container} 
        data-map-container
        className="absolute inset-0 min-h-[300px] min-w-[300px]"
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
