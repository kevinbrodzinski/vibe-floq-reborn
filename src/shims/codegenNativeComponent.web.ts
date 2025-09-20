// Minimal shim for web builds that expect RN Web's codegenNativeComponent
// This is a fallback if a deep import slips through the Vite aliases.
export default function codegenNativeComponent(name: string) {
  return name;
}

// Named export for compatibility
export { codegenNativeComponent };