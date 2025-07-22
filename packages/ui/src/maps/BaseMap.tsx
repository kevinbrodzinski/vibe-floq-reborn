// Platform detection for cross-platform maps
import React from 'react';
import type { BaseMapProps } from './types';

// Simple platform detection without react-native dependency for web-first apps
const isWeb = typeof window !== 'undefined';

// Dynamically import components to avoid require() issues
const WebMapComponent = React.lazy(() => import('./WebMap').then(m => ({ default: m.WebMap })));
const NativeMapComponent = React.lazy(() => import('./NativeMap').then(m => ({ default: m.NativeMap })));

export const BaseMap: React.FC<BaseMapProps> = (props) => {
  const Component = isWeb ? WebMapComponent : NativeMapComponent;
  
  return (
    <React.Suspense fallback={null}>
      <Component {...props} />
    </React.Suspense>
  );
};