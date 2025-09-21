// Web shim for React Native's TurboModuleRegistry
// This is needed for react-native-svg fabric components that try to import TurboModuleRegistry

export const TurboModuleRegistry = {
  getEnforcing: (name: string) => {
    console.warn(`[TurboModuleRegistry] ${name} not available on web, returning empty object`);
    return {};
  },
  get: (name: string) => {
    console.warn(`[TurboModuleRegistry] ${name} not available on web, returning null`);
    return null;
  },
};

export default TurboModuleRegistry;