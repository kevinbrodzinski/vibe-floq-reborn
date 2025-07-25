// Web stubs for native-only modules
// These prevent import errors when running web builds

// Stub for @posthog/react-native
export const posthog = {
  init: () => console.log('[PostHog] Mobile not available in web'),
  capture: () => {},
  identify: () => {},
  reset: () => {},
};

// Stub for expo-application
export const expoApplication = {
  applicationId: 'web-app',
  applicationName: 'floq-web',
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1.0.0',
};

// Stub for expo-device
export const expoDevice = {
  brand: 'web',
  manufacturer: 'web',
  modelName: 'web',
  modelId: 'web',
  designName: 'web',
  productName: 'web',
  deviceYearClass: 2024,
  totalMemory: 0,
  supportedCpuArchitectures: ['web'],
  osName: 'web',
  osVersion: '1.0.0',
  osBuildId: 'web',
  osInternalBuildId: 'web',
  deviceName: 'web',
  deviceType: 'UNKNOWN',
};

// Stub for sentry-expo
export const sentryExpo = {
  init: () => console.log('[Sentry] Mobile not available in web'),
  captureException: () => {},
  captureMessage: () => {},
  setUser: () => {},
  setTag: () => {},
  setExtra: () => {},
};

// Stub for react-native libraries
export const reactNativeLibraries = {
  version: '0.0.0',
  parseErrorStack: () => [],
  symbolicateStackTrace: () => Promise.resolve([]),
  getDevServer: () => null,
  polyfillGlobal: () => {},
};

// Default export for modules that use default exports
export default {
  posthog,
  expoApplication,
  expoDevice,
  sentryExpo,
  reactNativeLibraries,
  // Add any other exports that might be needed
  Application: expoApplication,
  Device: expoDevice,
  Sentry: sentryExpo,
};