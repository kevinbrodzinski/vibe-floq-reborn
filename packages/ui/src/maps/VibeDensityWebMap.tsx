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
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tokenSource, setTokenSource] = useState<string>('');

  useEffect(() => {
    if (!container.current || mapRef.current) return;

    const initializeMap = async () => {
      try {
        const { token, source } = await getMapboxToken();
        mapboxgl.accessToken = token;
        setTokenSource(source);
        
        if (import.meta.env.DEV) {
          console.log('[VibeDensityWebMap] Initializing map with token from:', source);
        }
        
        const map = new mapboxgl.Map({
          container: container.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [-118.24, 34.05],
          zoom: 11,
        });
        
        mapRef.current = map;

        // Handler for moveend events
        const handleMoveEnd = () => {
          const bb = map.getBounds();
          if (import.meta.env.DEV) {
            console.log('[VibeDensityWebMap] bbox =>', bb);
          }
          onRegionChange({
            minLat: bb.getSouth(), 
            minLng: bb.getWest(),
            maxLat: bb.getNorth(), 
            maxLng: bb.getEast(),
            zoom: map.getZoom(),
          });
        };

        // Register for projection AFTER style loads
        map.once('load', () => {
          if (import.meta.env.DEV) {
            console.log('[VibeDensityWebMap] Map loaded successfully');
          }
          setMapInstance(map);
          setTokenStatus('ready');
          
          // Fire the callback immediately after style loads
          handleMoveEnd();

          // Then subscribe for future moves
          map.on('moveend', handleMoveEnd);
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      } catch (error) {
        console.error('[VibeDensityWebMap] Failed to initialize map:', error);
        setTokenStatus('error');
      }
    };

    initializeMap();

    // Cleanup – prevents _cancelResize crash
    return () => {
      if (mapRef.current) {
        try {
          // Remove moveend listener if it exists
          const map = mapRef.current;
          map.off('moveend', () => {});
          
          setMapInstance(null);
          map.remove();
          mapRef.current = null;
          setTokenStatus('loading');
        } catch (error) {
          console.warn('[VibeDensityWebMap] Cleanup error (safe to ignore):', error);
        }
      }
    };
  }, []); // <- NO deps – runs once

  if (tokenStatus === 'loading') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading vibe density map...</p>
        </div>
      </div>
    );
  }

  if (tokenStatus === 'error') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-destructive mb-2">Failed to load vibe density map</p>
          <button 
            onClick={() => {
              setTokenStatus('loading');
              // Trigger re-initialization by clearing and re-running effect
              if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
              }
              window.location.reload();
            }} 
            className="text-xs text-muted-foreground hover:text-foreground"
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
      
      {/* Debug info in development */}
      {import.meta.env.DEV && (
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm border rounded px-2 py-1 text-xs font-mono">
          Density Token: {tokenSource}
        </div>
      )}
    </div>
  );
};