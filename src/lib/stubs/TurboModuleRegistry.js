// TurboModuleRegistry stub for React Native Web compatibility
// This satisfies react-native-svg's fabric components that expect TurboModuleRegistry

const TurboModuleRegistry = {
  get(name) {
    // Return a minimal stub for any requested turbo module
    return null;
  },
  getEnforcing(name) {
    // react-native-svg fabric modules call this
    // Return a minimal stub that satisfies the interface
    return {
      // Common methods that native modules might expose
      getConstants() { return {}; },
      // Add other methods as needed
    };
  },
};

export { TurboModuleRegistry };
export default TurboModuleRegistry;