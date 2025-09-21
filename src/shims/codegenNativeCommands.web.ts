// Web shim for React Native's codegenNativeCommands
// Used by react-native packages that try to create native commands

export default function codegenNativeCommands<T = any>(spec: any): T {
  // Return empty object for web - no native commands available
  console.warn('[codegenNativeCommands] Native commands not available on web');
  return {} as T;
}