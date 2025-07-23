import React, { Suspense } from 'react';
import { Platform }            from 'react-native';
import type { BaseMapProps }   from 'packages/ui/src/maps/types';

/* Lazy split – one bundle per platform --------------------------- */
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
  if (!visible) return null;   /* ⛑  guard prevents Web-GL from mounting */
  return (
    <Suspense fallback={null}>
      {Platform.OS === 'web'
        ? <WebMapLazy  {...rest} />
        : <NativeMapLazy {...rest} />}
    </Suspense>
  );
};