import { useState, useCallback, useMemo } from 'react';
import { calculateBounds, type Viewport } from '@/utils/geoConversion';
import { useGeolocation } from '@/hooks/useGeolocation';

export interface MapViewportControls {
  viewport: Viewport;
  setZoom: (zoom: number) => void;
  panTo: (lat: number, lng: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: (points: [number, number][]) => void;
  centerOnUser: () => void;
}

/**
 * Hook for managing viewport state in the field visualization system
 */
export function useMapViewport(
  initialCenter?: [number, number], 
  initialZoom: number = 5
): MapViewportControls {
  const { lat: userLat, lng: userLng } = useGeolocation();
  
  // Default to user location or San Francisco if location unavailable
  const defaultCenter: [number, number] = useMemo(() => {
    if (initialCenter) return initialCenter;
    if (userLat && userLng) return [userLat, userLng];
    return [37.7749, -122.4194]; // San Francisco
  }, [initialCenter, userLat, userLng]);

  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [zoom, setZoomState] = useState<number>(initialZoom);

  // Calculate viewport bounds whenever center or zoom changes
  const viewport: Viewport = useMemo(() => ({
    center,
    zoom,
    bounds: calculateBounds(center, zoom),
  }), [center, zoom]);

  // Zoom controls with bounds checking
  const setZoom = useCallback((newZoom: number) => {
    setZoomState(Math.max(1, Math.min(10, newZoom)));
  }, []);

  const zoomIn = useCallback(() => {
    setZoom(zoom + 1);
  }, [zoom, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(zoom - 1);
  }, [zoom, setZoom]);

  // Pan to specific coordinates
  const panTo = useCallback((lat: number, lng: number) => {
    setCenter([lat, lng]);
  }, []);

  // Center on user's current location
  const centerOnUser = useCallback(() => {
    if (userLat && userLng) {
      panTo(userLat, userLng);
    }
  }, [userLat, userLng, panTo]);

  // Zoom to fit multiple points with improved logarithmic calculation
  const zoomToFit = useCallback((points: [number, number][]) => {
    if (points.length === 0) return;
    
    if (points.length === 1) {
      panTo(points[0][0], points[0][1]);
      return;
    }

    // Calculate bounding box of points
    const lats = points.map(p => p[0]);
    const lngs = points.map(p => p[1]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Calculate center
    const newCenter: [number, number] = [
      (minLat + maxLat) / 2,
      (minLng + maxLng) / 2
    ];
    
    // Calculate required zoom using logarithmic scaling to match getFieldDimensions
    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;
    const maxRange = Math.max(latRange, lngRange);
    
    // Use inverse of the logarithmic scaling in getFieldDimensions
    // scale = 2^(5-zoom), so zoom = 5 - log2(scale)
    const requiredScale = maxRange / 0.01; // Base field size is 0.01
    const newZoom = Math.max(1, Math.min(10, 5 - Math.log2(requiredScale * 1.2))); // 1.2 padding
    
    setCenter(newCenter);
    setZoom(newZoom);
  }, [setZoom]);

  return {
    viewport,
    setZoom,
    panTo,
    zoomIn,
    zoomOut,
    zoomToFit,
    centerOnUser,
  };
}