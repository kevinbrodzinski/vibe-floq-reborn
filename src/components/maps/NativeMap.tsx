import React, { ReactNode } from 'react';
import { setMapInstance } from '@/lib/geo/project';

// Placeholder for React Native Mapbox implementation
// This will be implemented when mobile support is added
export interface NativeMapProps {
  onRegionChange?: (bounds: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
    zoom: number;
  }) => void;
  children?: ReactNode;
}

export const NativeMap: React.FC<NativeMapProps> = ({ onRegionChange, children }) => {
  React.useEffect(() => {
    if (__DEV__) {
      console.warn('Field view not yet supported on React Native');
    }
  }, []);

  // TODO: Implement React Native Mapbox when mobile support is added
  // Example for @rnmapbox/maps v10+:
  /*
  return (
    <MapboxGL.MapView
      style={{ flex: 1 }}
      onMapReady={async (event) => {
        try {
          const map = await event.target.getMap?.();
          if (map) setMapInstance(map);
        } catch (error) {
          console.warn('Failed to get map instance for projection:', error);
        }
      }}
      onRegionDidChange={onRegionChange}
    >
      {children}
    </MapboxGL.MapView>
  );
  */
  
  return (
    <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <p>Native Map</p>
        <p className="text-sm text-gray-400">Mobile implementation pending</p>
      </div>
      {children}
    </div>
  );
};