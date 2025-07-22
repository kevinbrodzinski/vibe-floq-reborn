// Platform detection for cross-platform maps
import React from 'react';
import type { BaseMapProps } from './types';

// Simple platform detection without react-native dependency for web-first apps
const isWeb = typeof window !== 'undefined';

export const BaseMap: React.FC<BaseMapProps> = isWeb
  ? require('./WebMap').WebMap
  : require('./NativeMap').NativeMap;