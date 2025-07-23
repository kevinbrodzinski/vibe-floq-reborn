
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { setMapInstance } from '@/lib/geo/project';
import { getMapboxToken } from '@/lib/geo/getMapboxToken';

// 🔒 works with every 2.x release – falls back gracefully
let MapboxWorker: any;
try {
  MapboxWorker = (await import('mapbox-gl/dist/mapbox-gl.worker.js?worker')).default;
} catch {
  MapboxWorker = undefined;                      // older mapbox-gl still OK
}
if (MapboxWorker) (mapboxgl as any).workerClass = MapboxWorker;

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
  const [status, setStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [errMsg, setErrMsg] = useState<string>();

  useEffect(() => {
    if (!container.current || mapRef.current) return;           // guard

    let destroyed = false;

    (async () => {
      try {
        /* ① ─ token ----------------------------------------------------------------- */
        const { token, source } = await getMapboxToken();       // ← your shared util
        mapboxgl.accessToken = token;
        import.meta.env.DEV && console.log('[VDWebMap] token from', source);

        /* ② ─ map ------------------------------------------------------------------- */
        const map = new mapboxgl.Map({
          container : container.current!,
          style     : 'mapbox://styles/mapbox/dark-v11',
          center    : [-118.24, 34.05],
          zoom      : 11,
          attributionControl: false
        });
        mapRef.current = map;

        /* ③ ─ dev diagnostics ------------------------------------------------------- */
        map.on('error', e => {
          console.error('[VDWebMap] mapbox-error ➜', e.error?.message || e);
          if (!destroyed) { setStatus('error'); setErrMsg(e.error?.message); }
        });
        map.on('styleimagemissing', e =>
          console.warn('[VDWebMap] missing sprite', e.id)
        );

        /* ④ ─ size sanity check ------------------------------------------------------ */
        const checkSize = () => {
          const h = container.current?.offsetHeight ?? 0;
          if (h === 0) {
            console.warn('[VDWebMap] container height 0 - map cannot render');
            if (!destroyed) setErrMsg('Map container has zero height');
          }
        };
        checkSize();

        /* ⑤ ─ move handler ---------------------------------------------------------- */
        const fireMove = () => {
          const b = map.getBounds();
          onRegionChange({
            minLat: b.getSouth(), minLng: b.getWest(),
            maxLat: b.getNorth(), maxLng: b.getEast(),
            zoom  : map.getZoom()
          });
        };

        /* ⑥ ─ load ------------------------------------------------------------------ */
        map.once('load', () => {
          if (destroyed) return;
          setMapInstance(map);
          fireMove();
          map.on('moveend', fireMove);
          setStatus('ready');
        });

        /* ⑦ ─ timeout fallback (15 s) ---------------------------------------------- */
        setTimeout(() => {
          if (destroyed) return;
          if (status === 'loading') {
            setStatus('error');
            setErrMsg('Map timed-out – check token or network');
          }
        }, 15_000);
      } catch (e: any) {
        console.error('[VDWebMap] init failed', e);
        if (!destroyed) { setStatus('error'); setErrMsg(e.message); }
      }
    })();

    /* ⑧ ─ cleanup ------------------------------------------------------------------ */
    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);   // ← still runs once

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
            onClick={() => window.location.reload()}
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
