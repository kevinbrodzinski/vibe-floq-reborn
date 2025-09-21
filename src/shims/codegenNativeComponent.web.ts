// Minimal web shim for RN Web's codegenNativeComponent.
// We don't need native codegen on web; return a no-op component factory.
export default function codegenNativeComponent<T extends string>(_name: T) {
  // Return a noop component that renders nothing on web.
  // Consumers (e.g., react-native-svg fabric) won't crash.
  return function Noop(_props: any) {
    return null;
  };
}