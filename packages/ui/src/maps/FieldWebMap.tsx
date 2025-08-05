
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
    if (!container.current || mapRef.current) return;

    let isMounted = true;
    let map: mapboxgl.Map | null = null;

    const mount = async () => {
      try {
        console.log('[FieldWebMap] 🗺️ Starting map initialization...');
        
        const { token, source } = await getMapboxToken();
        if (!isMounted) return;

        setTokenSource(source);
        mapboxgl.accessToken = token;

        console.log('[FieldWebMap] 🔑 Mapbox token acquired from:', source);

        // Ensure container still exists
        if (!container.current || !isMounted) {
          console.warn('[FieldWebMap] Container missing during init');
          return;
        }

        map = new mapboxgl.Map({
          container: container.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [-118.24, 34.05],
          zoom: 11,
          attributionControl: false // Reduce clutter
        });

        if (!isMounted) {
          map.remove();
          return;
        }

        mapRef.current = map;

        /* basic controls ---------- */
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        const handleMoveEnd = () => {
          if (!map || !isMounted) return;
          try {
            const bounds = map.getBounds();
            onRegionChange({
              minLat: bounds.getSouth(),
              minLng: bounds.getWest(),
              maxLat: bounds.getNorth(),
              maxLng: bounds.getEast(),
              zoom: map.getZoom()
            });
          } catch (e) {
            console.warn('[FieldWebMap] moveend error:', e);
          }
        };

        /* Enhanced map load handling with proper error catching */
        map.once('load', () => {
          if (!isMounted || !map) return;
          
          console.log('[FieldWebMap] 🗺️ Map loaded successfully');
          console.log('[FieldWebMap] 🗺️ Map ready for sources. Style loaded:', map.isStyleLoaded());
          
          setMapInstance(map);
          setTokenStatus('ready');
          
          // Fire initial region change
          handleMoveEnd();
        });

        map.on('error', (e) => {
          console.error('[FieldWebMap] Map error:', e);
          if (isMounted) {
            setTokenStatus('error');
          }
        });

        map.on('moveend', handleMoveEnd);

        // Enhanced debugging for Lovable preview
        if (import.meta.env.DEV) {
          (window as any).__FLOQ_MAP = map;
          console.log('[FieldWebMap] 🔧 Map instance available as window.__FLOQ_MAP');
        }

      } catch (err) {
        console.error('[FieldWebMap] 💥 Map initialization failed:', err);
        if (isMounted) {
          setTokenStatus('error');
        }
      }
    };

    mount();

    return () => {
      isMounted = false;
      if (map) {
        try {
          console.log('[FieldWebMap] 🧹 Cleaning up map...');
          map.off('moveend');
          map.off('load');
          map.off('error');
          setMapInstance(null);
          map.remove();
        } catch (e) {
          console.warn('[FieldWebMap] Cleanup error:', e);
        } finally {
          mapRef.current = null;
          setTokenStatus('loading');
          if (import.meta.env.DEV) {
            (window as any).__FLOQ_MAP = null;
          }
        }
      }
    };
  }, []);

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
            onClick={() => {
              setTokenStatus('loading');
              // Trigger re-initialization by clearing and re-running effect
              if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
              }
              window.location.reload();
            }}
          >
            Try again
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
