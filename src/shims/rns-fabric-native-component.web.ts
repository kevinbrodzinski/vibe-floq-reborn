// Web stub for react-native-svg fabric native components
// These are native-only components that don't exist in web builds

export default function createNativeComponent() {
  // Return a no-op function that matches the expected interface
  return () => null;
}

// Also export any common fabric native component exports
export const NativeComponent = createNativeComponent();
export { createNativeComponent };