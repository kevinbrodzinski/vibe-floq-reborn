import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { getMapboxToken }       from '@/lib/geo/getMapboxToken';
import { setMapInstance }       from '@/lib/geo/project';

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
  const mapRef    = useRef<mapboxgl.Map|null>(null);

  const [status, setStatus]   = useState<'loading'|'ready'|'error'>('loading');
  const [errMsg, setErrMsg]   = useState<string>();
  const [tokenSource, setSrc] = useState<string>();

  /* ------------------------------------------------------------------ */
  /* mount                                                              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!container.current || mapRef.current) return;

    let aborted = false;

    (async () => {
      try {
        /* token */
        const { token, source } = await getMapboxToken();
        mapboxgl.accessToken = token;
        setSrc(source);

        /* map */
        const map = new mapboxgl.Map({
          container: container.current!,
          style    : 'mapbox://styles/mapbox/dark-v11',
          center   : [-118.24, 34.05],
          zoom     : 11
        });
        mapRef.current = map;

        const fireMove = () => {
          const b = map.getBounds();
          onRegionChange({
            minLat: b.getSouth(), minLng: b.getWest(),
            maxLat: b.getNorth(), maxLng: b.getEast(),
            zoom  : map.getZoom()
          });
        };

        map.once('load', () => {
          if (aborted) return;
          setMapInstance(map);
          fireMove();
          map.on('moveend', fireMove);
          setStatus('ready');
        });

        map.on('error', e => {
          console.error('[WebMap] mapbox error →', e.error?.message || e);
          if (!aborted) {
            setErrMsg(e.error?.message);
            setStatus('error');
          }
        });
      } catch (e:any) {
        if (!aborted) {
          setErrMsg(e.message ?? 'init failed');
          setStatus('error');
        }
      }
    })();

    /* cleanup */
    return () => {
      aborted = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapInstance(null);
      }
    };
  }, [onRegionChange]);

  /* ------------------------------------------------------------------ */
  /* render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div className="absolute inset-0">
      {/* 1️⃣  ALWAYS present so Mapbox can mount */}
      <div ref={container} data-map-container className="absolute inset-0" />

      {/* 2️⃣  Overlays */}
      {status === 'loading' && (
        <div className="absolute inset-0 grid place-items-center bg-background/80 z-50">
          <div className="flex flex-col items-center gap-2">
            <span className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"/>
            <span className="text-sm text-muted-foreground">Loading map…</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center bg-background/80 z-50">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-sm text-destructive">Map error</span>
            {errMsg && <span className="text-xs text-muted-foreground">{errMsg}</span>}
            <button
              className="text-xs underline decoration-dotted mt-1"
              onClick={() => {
                setStatus('loading');
                setErrMsg(undefined);
              }}
            >
              try again
            </button>
          </div>
        </div>
      )}

      {/* children + dev panel */}
      {children}
      {import.meta.env.DEV && (
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm border rounded px-2 py-1 text-xs font-mono">
          token-src: {tokenSource}
        </div>
      )}
    </div>
  );
};