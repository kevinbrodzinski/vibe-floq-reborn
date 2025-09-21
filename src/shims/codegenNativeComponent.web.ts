// Web shim for React Native's codegenNativeComponent
// Used by react-native packages that try to create native components

export default function codegenNativeComponent<T = any>(componentName: string): T {
  // Return a simple div-based component for web
  return function WebComponent(props: any) {
    return null; // Or return a simple div if needed
  } as T;
}