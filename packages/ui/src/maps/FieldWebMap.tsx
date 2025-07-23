
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
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tokenSource, setTokenSource] = useState<string>('');

  useEffect(() => {
    if (!container.current || mapRef.current) return;

    const initializeMap = async () => {
      try {
        const { token, source } = await getFieldMapboxToken();
        mapboxgl.accessToken = token;
        setTokenSource(source);
        
        const map = new mapboxgl.Map({
          container: container.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [-118.24, 34.05],
          zoom: 11,
        });
        
        mapRef.current = map;
        setTokenStatus('ready');

        // Register for projection AFTER style loads
        map.once('load', () => setMapInstance(map));

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Viewport → React
        const onMove = () => {
          const b = map.getBounds();
          onRegionChange({
            minLat: b.getSouth(), minLng: b.getWest(),
            maxLat: b.getNorth(), maxLng: b.getEast(),
            zoom: map.getZoom(),
          });
        };
        map.on('moveend', onMove);

        // Initial bounds callback
        onMove();

      } catch (error) {
        console.error('[FieldWebMap] Failed to initialize map:', error);
        setTokenStatus('error');
      }
    };

    initializeMap();

    // Cleanup – prevents _cancelResize crash
    return () => {
      if (mapRef.current) {
        setMapInstance(null);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onRegionChange]);

  if (tokenStatus === 'loading') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading field map...</p>
        </div>
      </div>
    );
  }

  if (tokenStatus === 'error') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-destructive mb-2">Failed to load field map</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reload page
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
          Field Token: {tokenSource}
        </div>
      )}
    </div>
  );
};
