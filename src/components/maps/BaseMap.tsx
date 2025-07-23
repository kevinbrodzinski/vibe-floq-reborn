import React, { Suspense } from 'react';
import { Platform } from 'react-native';

import type { ViewportBounds } from 'packages/ui/src/maps/types';

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */
export interface BaseMapProps {
  /** Fires every time the user pans / zooms */
  onRegionChange: (b: ViewportBounds) => void;
  children?: React.ReactNode;
  /**
   * When `false` the map doesn't mount at-all (useful for hidden sheets or
   * off-screen tabs).  **Optional** so existing call-sites keep compiling.
   */
  visible?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Platform-split (lazy)                                             */
/* ------------------------------------------------------------------ */
const WebMapLazy = React.lazy(() =>
  import('./WebMap').then(m => ({ default: m.WebMap })),
);

const NativeMapLazy = React.lazy(() =>
  import('./NativeMap').then(m => ({ default: m.NativeMap })),
);

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export const BaseMap: React.FC<BaseMapProps> = ({
  visible = true,
  ...rest
}) => {
  if (!visible) return null;                 // guards WebGL when hidden

  return (
    <Suspense fallback={null}>
      {Platform.OS === 'web'
        ? <WebMapLazy {...rest} />
        : <NativeMapLazy {...rest} />}
    </Suspense>
  );
};