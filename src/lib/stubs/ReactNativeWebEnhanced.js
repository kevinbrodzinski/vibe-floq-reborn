// Enhanced React Native Web compatibility layer
// Re-exports everything from react-native-web while adding TurboModuleRegistry

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

// Export react-native-web as default (it doesn't have its own default export)
export default RNWeb;