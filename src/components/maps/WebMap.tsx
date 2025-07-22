import React, { useEffect, useRef, ReactNode, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { setMapInstance } from '@/lib/geo/project';
import { supabase } from '@/integrations/supabase/client';

// Default fallback token
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

export interface WebMapProps {
  onRegionChange?: (bounds: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
    zoom: number;
  }) => void;
  children?: ReactNode;
}

export const WebMap: React.FC<WebMapProps> = ({ onRegionChange, children }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map>();
  const [tokenLoaded, setTokenLoaded] = useState(false);

  // Load Mapbox token from Supabase edge function
  useEffect(() => {
    const loadMapboxToken = async () => {
      try {
        console.log('🗺️ Fetching Mapbox token from edge function...');
        const { data, error } = await supabase.functions.invoke('mapbox-token');
        
        if (error) {
          console.warn('🗺️ Failed to fetch token from edge function:', error.message);
        } else if (data?.token) {
          mapboxgl.accessToken = data.token;
          console.log('🗺️ Successfully loaded Mapbox token from edge function');
        } else {
          console.warn('🗺️ No token in response, using fallback');
        }
        } catch (err) {
          console.warn('🗺️ Error fetching token, using fallback:', err?.message ?? err);
        } finally {
        setTokenLoaded(true);
      }
    };

    loadMapboxToken();
  }, []);

  // Initialize map after token is loaded
  useEffect(() => {
    if (!tokenLoaded || !mapContainerRef.current) {
      console.warn('🗺️ Map container ref not found');
      return;
    }

    console.log('🗺️ Initializing Mapbox map...');

    // Initialize Mapbox map
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-118.243685, 34.052234], // Los Angeles (default)
      zoom: 11,
      pitch: 0,
      bearing: 0,
    });

    // Add error handling
    mapRef.current.on('error', (e) => {
      console.error('🗺️ Mapbox error:', e.error);
    });

    // Add style load event
    mapRef.current.on('styledata', () => {
      console.log('🗺️ Map style loaded');
    });

    // Add navigation controls
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Inject map instance for projection utils after style loads
    mapRef.current.on('load', () => {
      console.log('🗺️ Map loaded successfully');
      console.log('🗺️ Container dimensions:', mapContainerRef.current?.clientWidth, 'x', mapContainerRef.current?.clientHeight);
      if (mapRef.current) {
        setMapInstance(mapRef.current);
      }
    });

    // Handle map move events for field tile updates
    const handleMoveEnd = () => {
      if (!mapRef.current || !onRegionChange) return;
      
      const bounds = mapRef.current.getBounds();
      const zoom = mapRef.current.getZoom();
      
      onRegionChange({
        minLat: bounds.getSouth(),
        minLng: bounds.getWest(),
        maxLat: bounds.getNorth(),
        maxLng: bounds.getEast(),
        zoom,
      });
    };

    mapRef.current.on('moveend', handleMoveEnd);

    // Initial bounds callback
    if (onRegionChange) {
      handleMoveEnd();
    }

    // Cleanup
    return () => {
      mapRef.current?.remove();
    };
  }, [onRegionChange, tokenLoaded]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 w-full h-full bg-gray-900"
        style={{ minHeight: '400px' }}
      />
      {/* Show loading state while token is being fetched */}
      {!tokenLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
            <div>Loading map...</div>
          </div>
        </div>
      )}
      {/* Children (like FieldCanvas) render as overlay */}
      <div className="absolute inset-0 pointer-events-none bg-transparent">
        {children}
      </div>
    </div>
  );
};