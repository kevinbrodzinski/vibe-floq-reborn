
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

export const WebMap: React.FC<Props> = ({ onRegionChange, children }) => {
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
        
        const map = new mapboxgl.Map({
          container: container.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [-118.24, 34.05],
          zoom: 11,
        });
        
        mapRef.current = map;

        // Handler for moveend events
        const handleMoveEnd = () => {
          const b = map.getBounds();
          onRegionChange({
            minLat: b.getSouth(), minLng: b.getWest(),
            maxLat: b.getNorth(), maxLng: b.getEast(),
            zoom: map.getZoom(),
          });
        };

        // Register for projection AFTER style loads
        map.once('load', () => {
          setMapInstance(map);
          setTokenStatus('ready');
          
          // Fire once immediately after load
          handleMoveEnd();
        });

        map.on('moveend', handleMoveEnd);

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      } catch (error) {
        console.error('[WebMap] Failed to initialize map:', error);
        setTokenStatus('error');
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      if (mapRef.current) {
        const map = mapRef.current;
        map.off('moveend', () => {});
        setMapInstance(null);
        map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (tokenStatus === 'loading') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (tokenStatus === 'error') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-destructive mb-2">Failed to load map</p>
          <button 
            onClick={() => {
              setTokenStatus('loading');
              if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
              }
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
          Token: {tokenSource}
        </div>
      )}
    </div>
  );
};
