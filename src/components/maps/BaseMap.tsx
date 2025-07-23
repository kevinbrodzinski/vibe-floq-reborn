import React, { Suspense } from 'react';
import { Platform } from 'react-native';

import type { ViewportBounds } from 'packages/ui/src/maps/types';

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */
import type { BaseMapProps } from 'packages/ui/src/maps/types';

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