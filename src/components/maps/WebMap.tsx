import React, { useEffect, useRef, ReactNode } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Configure Mapbox access token
// Use the secret management approach for token loading
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'; // Default public token

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

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Mapbox map
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-118.243685, 34.052234], // Los Angeles (default)
      zoom: 11,
      pitch: 0,
      bearing: 0,
    });

    // Add navigation controls
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

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
  }, [onRegionChange]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 w-full h-full"
      />
      {/* Children (like FieldCanvas) render as overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {children}
      </div>
    </div>
  );
};