
import React, { Suspense } from 'react';
import { Platform } from 'react-native';
import type { ViewportBounds } from '../../../packages/ui/src/maps/types';

interface BaseMapProps {
  onRegionChange: (b: ViewportBounds) => void;
  children?: React.ReactNode;
}

const WebMapLazy = React.lazy(() => import('./WebMap').then(m => ({ default: m.WebMap })));
const NativeMapLazy = React.lazy(() => import('./NativeMap').then(m => ({ default: m.NativeMap })));

export const BaseMap: React.FC<BaseMapProps> = (props) => (
  <Suspense fallback={null}>
    {Platform.OS === 'web'
      ? <WebMapLazy {...props} />
      : <NativeMapLazy {...props} />}
  </Suspense>
);
