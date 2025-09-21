// Stub for react-native-svg fabric components that fail on web
// These components try to import TurboModuleRegistry and other native-only APIs

// Create a minimal stub that satisfies the fabric component interface
const fabricStub = {
  // Common methods that fabric components might expose
  getConstants() { return {}; },
  // Add other methods as needed for compatibility
};

export default fabricStub;