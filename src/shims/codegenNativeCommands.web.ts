// Minimal shim for web builds that expect RN Web's codegenNativeCommands
export default function codegenNativeCommands(config: any) {
  return {};
}

// Named export for compatibility  
export { codegenNativeCommands };