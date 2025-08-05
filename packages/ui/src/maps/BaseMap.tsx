import React, { Suspense } from 'react';
import { Platform } from 'react-native';
import type { BaseMapProps } from '../../../packages/ui/src/maps/types';

interface BaseMapProps {
  onRegionChange: (b: ViewportBounds) => void;
  children?: React.ReactNode;
  /** When false the map doesn’t mount (avoids Mapbox re-flows inside hidden sheets) */
  visible?: boolean;                           //  ⭐ added
}

/* Lazy-loaded platform splits */
const WebMapLazy    = React.lazy(() =>
  import('./WebMap').then(m => ({ default: m.WebMap })),
);
const NativeMapLazy = React.lazy(() =>
  import('./NativeMap').then(m => ({ default: m.NativeMap })),
);

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export const BaseMap: React.FC<BaseMapProps> = ({
  visible = true,                             //  ⭐ default true
  ...rest
}) => {
  if (!visible) return null;                  //  ⭐ guard fixes TS2741
  return (
    <Suspense fallback={null}>
      {Platform.OS === 'web'
        ? <WebMapLazy    {...rest} />
        : <NativeMapLazy {...rest} />}
    </Suspense>
  );
};