// Stub for TurboModuleRegistry calls from react-native-web vendor files
export const TurboModuleRegistry = {
  getEnforcing: (name) => {
    console.warn(`[TurboModuleRegistry] ${name} not available on web, returning empty object`);
    return {};
  },
  get: (name) => {
    console.warn(`[TurboModuleRegistry] ${name} not available on web, returning null`);
    return null;
  },
};

export default TurboModuleRegistry;