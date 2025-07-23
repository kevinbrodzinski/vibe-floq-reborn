import React, { Suspense } from 'react';
import { Platform } from 'react-native';

import type { ViewportBounds } from './types';

export interface BaseMapProps {
  onRegionChange: (b: ViewportBounds) => void;
  children?: React.ReactNode;
  /** When `false` the map never mounts (safe for hidden sheets) */
  visible?: boolean;
}

/* Lazy-split per platform */
const WebMapLazy   = React.lazy(() => import('./WebMap').then(m => ({ default: m.WebMap })));
const NativeMapLazy = React.lazy(() => import('./NativeMap').then(m => ({ default: m.NativeMap })));

export const BaseMap: React.FC<BaseMapProps> = ({ visible = true, ...rest }) => {
  if (!visible) return null;
  return (
    <Suspense fallback={null}>
      {Platform.OS === 'web'
        ? <WebMapLazy   {...rest} />
        : <NativeMapLazy {...rest} />}
    </Suspense>
  );
};