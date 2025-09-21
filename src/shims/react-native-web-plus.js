// Enhanced React Native Web shim that includes TurboModuleRegistry
// This file re-exports everything from react-native-web AND adds missing exports

// Re-export everything from react-native-web
export * from 'react-native-web';

// Import and re-export TurboModuleRegistry from our lib stub
import { TurboModuleRegistry } from '../lib/stubs/TurboModuleRegistry.js';

// Export TurboModuleRegistry as a named export
export { TurboModuleRegistry };

// Also export as default for any default imports
import ReactNativeWeb from 'react-native-web';
export default ReactNativeWeb;