
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { setMapInstance } from '@/lib/geo/project';
import { registerMapboxWorker } from '@/lib/geo/registerMapboxWorker';
import { getMapboxToken } from '@/lib/geo/getMapboxToken';
import { TimerId } from '@/types/Timer';

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
  const timeoutRef = useRef<TimerId>();
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tokenSource, setTokenSource] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!container.current || mapRef.current) return;

    const initializeMap = async () => {
      try {
        console.log('[VibeDensityWebMap] Starting initialization...');
        
        // Validate container dimensions
        const containerRect = container.current?.getBoundingClientRect();
        console.log('[VibeDensityWebMap] Container dimensions:', {
          width: containerRect?.width,
          height: containerRect?.height,
          visible: containerRect && containerRect.width > 0 && containerRect.height > 0
        });

        if (!containerRect || containerRect.width === 0 || containerRect.height === 0) {
          throw new Error('Map container has no dimensions');
        }

        // Set loading timeout
        timeoutRef.current = setTimeout(() => {
          console.error('[VibeDensityWebMap] Map initialization timeout');
          setErrorMessage('Map loading timeout - please try again');
          setTokenStatus('error');
        }, 15000); // 15 second timeout

        const { token, source } = await getMapboxToken();
        mapboxgl.accessToken = token;
        setTokenSource(source);
        
        console.log('[VibeDensityWebMap] Token acquired from:', source);
        console.log('[VibeDensityWebMap] Creating map instance...');
        
        const map = new mapboxgl.Map({
          container: container.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [-118.24, 34.05],
          zoom: 11,
          preserveDrawingBuffer: true,
          attributionControl: false
        });
        
        mapRef.current = map;
        console.log('[VibeDensityWebMap] Map instance created');

        // Add error handler
        map.on('error', (e) => {
          console.error('[VibeDensityWebMap] Map error:', e.error);
          clearTimeout(timeoutRef.current);
          setErrorMessage(`Map error: ${e.error?.message || 'Unknown error'}`);
          setTokenStatus('error');
        });

        // Handler for moveend events
        const handleMoveEnd = () => {
          const bb = map.getBounds();
          console.log('[VibeDensityWebMap] Region changed:', {
            south: bb.getSouth(),
            west: bb.getWest(),
            north: bb.getNorth(),
            east: bb.getEast(),
            zoom: map.getZoom()
          });
          onRegionChange({
            minLat: bb.getSouth(), 
            minLng: bb.getWest(),
            maxLat: bb.getNorth(), 
            maxLng: bb.getEast(),
            zoom: map.getZoom(),
          });
        };

        // Style load handler with timeout protection
        const styleLoadPromise = new Promise<void>((resolve, reject) => {
          const styleTimeout = setTimeout(() => {
            reject(new Error('Style loading timeout'));
          }, 10000);

          map.once('styledata', () => {
            console.log('[VibeDensityWebMap] Style loaded');
            clearTimeout(styleTimeout);
            resolve();
          });
        });

        // Wait for style to load
        await styleLoadPromise;
        
        console.log('[VibeDensityWebMap] Map fully loaded');
        
        // Clear timeout and set ready state
        clearTimeout(timeoutRef.current);
        setMapInstance(map);
        setTokenStatus('ready');
        
        // Subscribe to moveend events
        map.on('moveend', handleMoveEnd);
        
        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        
        // Fire initial callback
        handleMoveEnd();

      } catch (error) {
        console.error('[VibeDensityWebMap] Initialization failed:', error);
        clearTimeout(timeoutRef.current);
        setErrorMessage(error instanceof Error ? error.message : 'Unknown initialization error');
        setTokenStatus('error');
      }
    };

    // Small delay to ensure container is rendered
    const initTimeout = setTimeout(initializeMap, 100);

    return () => {
      clearTimeout(initTimeout);
      clearTimeout(timeoutRef.current);
      
      if (mapRef.current) {
        try {
          const map = mapRef.current;
          console.log('[VibeDensityWebMap] Cleaning up map instance');
          
          // Remove all event listeners
          map.off('moveend', () => {});
          map.off('error', () => {});
          
          setMapInstance(null);
          map.remove();
          mapRef.current = null;
          setTokenStatus('loading');
          setErrorMessage('');
        } catch (error) {
          console.warn('[VibeDensityWebMap] Cleanup error (safe to ignore):', error);
        }
      }
    };
  }, []); // No dependencies - runs once

  if (tokenStatus === 'loading') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading vibe density map...</p>
          <p className="text-xs text-muted-foreground mt-1">Initializing interactive map</p>
        </div>
      </div>
    );
  }

  if (tokenStatus === 'error') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-4">
          <p className="text-sm text-destructive mb-2">Failed to load vibe density map</p>
          {errorMessage && (
            <p className="text-xs text-muted-foreground mb-3">{errorMessage}</p>
          )}
          <button 
            onClick={() => {
              console.log('[VibeDensityWebMap] Retrying initialization...');
              setTokenStatus('loading');
              setErrorMessage('');
              // Force re-mount by clearing and re-running effect
              if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
              }
              // Trigger re-initialization
              window.location.reload();
            }} 
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Try again
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
          <div>Density Token: {tokenSource}</div>
          <div>Status: {tokenStatus}</div>
          {errorMessage && <div className="text-destructive">Error: {errorMessage}</div>}
        </div>
      )}
    </div>
  );
};
