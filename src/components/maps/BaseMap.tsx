import React, { Suspense } from 'react';
import { Platform } from 'react-native';

import type {
  ViewportBounds,
  BaseMapProps as SharedBaseMapProps,
} from 'packages/ui/src/maps/types';

/** Local addon: let parents mount / unmount the map */
export interface BaseMapProps extends SharedBaseMapProps {
  /** When false the map never mounts (great for hidden sheets). */
  visible?: boolean;
}

/* lazy-split per platform ------------------------------------------------- */
const WebMapLazy = React.lazy(() =>
  import('./WebMap').then((m) => ({ default: m.WebMap })),
);
const NativeMapLazy = React.lazy(() =>
  import('./NativeMap').then((m) => ({ default: m.NativeMap })),
);

/* wrapper ----------------------------------------------------------------- */
export const BaseMap: React.FC<BaseMapProps> = ({
  visible = true,
  ...rest
}) => {
  if (!visible) return null; // guard

  return (
    <Suspense fallback={null}>
      {Platform.OS === 'web' ? (
        <WebMapLazy {...rest} />
      ) : (
        <NativeMapLazy {...rest} />
      )}
    </Suspense>
  );
};