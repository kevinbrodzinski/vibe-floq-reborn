import { useCallback } from 'react';

interface ViewportBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  zoom: number;
}

export const useFieldViewport = () => {
  const onRegionChange = useCallback((bounds: ViewportBounds) => {
    // TODO: Connect to field tiles system
    console.log('Field viewport changed:', bounds);
    
    // This will eventually trigger field tile updates
    // For now, just log the bounds for Phase 2 integration
  }, []);

  return {
    onRegionChange,
  };
};