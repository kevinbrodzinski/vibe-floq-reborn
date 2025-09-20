// Shim for legacy RN Web deep import - fallback implementation
export default function codegenNativeComponent(name: string) {
  // Return a minimal component that works for web
  return function WebComponent(props: any) {
    return null;
  };
}