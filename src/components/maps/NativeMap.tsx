import React, { ReactNode } from 'react';

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
  // TODO: Implement React Native Mapbox when mobile support is added
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