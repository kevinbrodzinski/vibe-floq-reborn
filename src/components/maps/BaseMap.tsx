import React, { Suspense } from 'react';
import { Platform } from 'react-native';

import type { ViewportBounds } from './types';

interface BaseMapProps {
  /** Fires every time the user pans / zooms */
  onRegionChange: (b: ViewportBounds) => void;
  children?: React.ReactNode;
  /**
   * When `false` the map doesn’t mount at all.
   * Handy for hidden sheets or off-screen tabs.
   */
  visible?: boolean;           // 🆕  made optional – fixes TS2741
}

/* Lazy-split per platform ---------------------------------------- */
const WebMapLazy = React.lazy(() =>
  import('./WebMap').then(m => ({ default: m.WebMap })),
);
const NativeMapLazy = React.lazy(() =>
  import('./NativeMap').then(m => ({ default: m.NativeMap })),
);

/* ---------------------------------------------------------------- */
export const BaseMap: React.FC<BaseMapProps> = ({
  visible = true,
  ...rest
}) => {
  if (!visible) return null;   // 🆕 guard
  return (
    <Suspense fallback={null}>
      {Platform.OS === 'web'
        ? <WebMapLazy {...rest} />
        : <NativeMapLazy {...rest} />}
    </Suspense>
  );
};