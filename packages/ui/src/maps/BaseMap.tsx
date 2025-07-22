// Platform detection for cross-platform maps
// For web-first projects, we'll default to WebMap
// React Native detection can be added later when mobile support is needed

// Simple platform detection without react-native dependency
const isWeb = typeof window !== 'undefined';

export const BaseMap = isWeb
  ? require('./WebMap').WebMap
  : require('./NativeMap').NativeMap;