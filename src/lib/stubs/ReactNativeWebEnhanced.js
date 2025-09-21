// Enhanced React Native Web module that includes missing exports
// This ensures react-native-svg and other packages get the exports they expect

import * as RNWeb from 'react-native-web';

// Re-export everything from react-native-web
export * from 'react-native-web';

// Add TurboModuleRegistry for react-native-svg fabric components
export const TurboModuleRegistry = {
  get(name) {
    return null;
  },
  getEnforcing(name) {
    return {
      getConstants() { return {}; },
    };
  },
};

// Add other commonly missing exports
export const NativeModules = RNWeb.NativeModules || {};

// Enhanced Platform with missing properties
export const Platform = {
  ...RNWeb.Platform,
  constants: RNWeb.Platform.constants || {},
};

// DeviceInfo stub for compatibility
export const DeviceInfo = {
  getConstants() { return {}; },
};

// UIManager for layout measurements
export const UIManager = RNWeb.UIManager || {
  measureInWindow() {},
  measure() {},
};

// Create default export that includes everything
const ReactNativeWebEnhanced = {
  ...RNWeb,
  TurboModuleRegistry,
  NativeModules,
  Platform,
  DeviceInfo,
  UIManager,
};

export default ReactNativeWebEnhanced;