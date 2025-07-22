import React, { Suspense } from 'react';
import { Platform } from 'react-native';
import type { BaseMapProps } from './types';

const WebMapLazy = React.lazy(() => import('./WebMap').then(m => ({ default: m.WebMap })));
const NativeMapLazy = React.lazy(() => import('./NativeMap').then(m => ({ default: m.NativeMap })));

export const BaseMap: React.FC<BaseMapProps> = (props) => (
  <Suspense fallback={null}>
    {Platform.OS === 'web'
      ? <WebMapLazy {...props} />
      : <NativeMapLazy {...props} />}
  </Suspense>
);