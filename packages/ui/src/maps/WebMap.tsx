import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createClient } from '@supabase/supabase-js';
import type { BaseMapProps } from './types';

// Create supabase client directly to avoid import path issues
const supabase = createClient(
  'https://reztyrrafsmlvvlqvsqt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlenR5cnJhZnNtbHZ2bHF2c3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNTI5MTcsImV4cCI6MjA2NzYyODkxN30.6rCBIkV5Fk4qzSfiAR0I8biCQ-YdfdT-ZnJZigWqSck'
);

// Initialize with a default public token, will be replaced by Supabase secret
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

export const WebMap: React.FC<BaseMapProps> = ({
  onRegionChange,
  children,
}) => {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map>();
  const [tokenLoaded, setTokenLoaded] = useState(false);

  // Load Mapbox token from Supabase edge function with caching
  useEffect(() => {
    const loadMapboxToken = async () => {
      try {
        // Check cache first
        const cachedToken = sessionStorage.getItem('mapbox_token');
        if (cachedToken) {
          mapboxgl.accessToken = cachedToken;
          setTokenLoaded(true);
          return;
        }

        const { data, error } = await supabase.functions.invoke('mapbox-token');
        if (data?.token && !error) {
          mapboxgl.accessToken = data.token;
          sessionStorage.setItem('mapbox_token', data.token);
          setTokenLoaded(true);
        } else {
          console.warn('Using default Mapbox token - add MAPBOX_ACCESS_TOKEN to Supabase secrets');
          setTokenLoaded(true);
        }
      } catch (error) {
        console.warn('Failed to load Mapbox token from Supabase, using default:', error);
        setTokenLoaded(true);
      }
    };
    
    loadMapboxToken();
  }, []);

  // Initialize map once token is loaded
  useEffect(() => {
    if (!container.current || !tokenLoaded) {
      console.log('🗺 Map init skipped:', { 
        hasContainer: !!container.current, 
        tokenLoaded,
        containerDims: container.current ? 
          `${container.current.clientWidth}x${container.current.clientHeight}` : 'none'
      });
      return;
    }

    console.log('🗺 Initializing map with container:', {
      width: container.current.clientWidth,
      height: container.current.clientHeight,
      token: mapboxgl.accessToken.substring(0, 20) + '...'
    });

    try {
      mapRef.current = new mapboxgl.Map({
        container: container.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-118.24, 34.05], // LA
        zoom: 11,
      });

      mapRef.current.on('load', () => {
        console.log('🗺 Map loaded successfully');
        // Check if canvas was created
        const canvas = document.querySelector('.mapboxgl-canvas');
        if (canvas) {
          console.log('🗺 Canvas created:', {
            width: canvas.clientWidth,
            height: canvas.clientHeight
          });
        } else {
          console.error('🗺 No canvas found after map load');
        }
      });

      mapRef.current.on('error', (e) => {
        console.error('🗺 Map error:', e);
      });

      const handleMoveEnd = () => {
        const m = mapRef.current!;
        const b = m.getBounds();
        onRegionChange({
          minLat: b.getSouth(),
          minLng: b.getWest(),
          maxLat: b.getNorth(),
          maxLng: b.getEast(),
          zoom: m.getZoom(),
        });
      };

      mapRef.current.on('moveend', handleMoveEnd);
    } catch (error) {
      console.error('🗺 Failed to create map:', error);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('moveend');
        mapRef.current.remove();
      }
    };
  }, [onRegionChange, tokenLoaded]);

  return (
    <div ref={container} className="w-full h-full">
      {children}
    </div>
  );
};