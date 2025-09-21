// Enhanced React Native Web compatibility layer
// Handles missing exports that react-native-svg and other RN packages expect

import * as RNWeb from 'react-native-web';

// Export everything from react-native-web first
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

// Create a comprehensive React Native Web export that includes missing pieces
const ReactNativeWebEnhanced = {
  ...RNWeb,
  
  // Add TurboModuleRegistry for react-native-svg fabric components
  TurboModuleRegistry,
  
  // Add other commonly missing exports
  NativeModules: RNWeb.NativeModules || {},
  
  // Platform info
  Platform: {
    ...RNWeb.Platform,
    constants: RNWeb.Platform.constants || {},
  },
  
  // DeviceInfo stub
  DeviceInfo: {
    getConstants() { return {}; },
  },
  
  // UIManager for layout measurements
  UIManager: RNWeb.UIManager || {
    measureInWindow() {},
    measure() {},
  },
};

export default ReactNativeWebEnhanced;