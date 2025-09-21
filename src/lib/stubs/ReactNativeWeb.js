// Enhanced React Native Web compatibility layer
// Handles missing exports that react-native-svg and other RN packages expect

import * as RNWeb from 'react-native-web';
import { TurboModuleRegistry } from './TurboModuleRegistry.js';

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

// Export everything
export * from 'react-native-web';
export { TurboModuleRegistry };
export default ReactNativeWebEnhanced;