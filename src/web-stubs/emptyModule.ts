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

// Stub for expo-constants
export const expoConstants = {
  expoConfig: {
    name: 'floq-web',
    slug: 'floq-web',
    version: '1.0.0',
    platform: ['web'],
  },
  manifest: {
    name: 'floq-web',
    slug: 'floq-web',
    version: '1.0.0',
  },
  appOwnership: 'expo',
  deviceName: 'web',
  deviceYearClass: 2024,
  isDevice: false,
  isExpoGo: false,
  nativeAppVersion: '1.0.0',
  nativeBuildVersion: '1.0.0',
  platform: 'web',
  sessionId: 'web-session',
  systemVersion: '1.0.0',
  // Add more properties that might be accessed
  installationId: 'web-installation',
  applicationId: 'floq-web',
  buildVersion: '1.0.0',
  appVersion: '1.0.0',
  // Add a default export for direct imports
  default: {
    expoConfig: {
      name: 'floq-web',
      slug: 'floq-web',
      version: '1.0.0',
      platform: ['web'],
    },
    manifest: {
      name: 'floq-web',
      slug: 'floq-web',
      version: '1.0.0',
    },
    appOwnership: 'expo',
    deviceName: 'web',
    deviceYearClass: 2024,
    isDevice: false,
    isExpoGo: false,
    nativeAppVersion: '1.0.0',
    nativeBuildVersion: '1.0.0',
    platform: 'web',
    sessionId: 'web-session',
    systemVersion: '1.0.0',
    installationId: 'web-installation',
    applicationId: 'floq-web',
    buildVersion: '1.0.0',
    appVersion: '1.0.0',
  }
};

// Stub for expo-asset
export const expoAsset = {
  Asset: {
    fromModule: () => Promise.resolve({ uri: 'web-asset' }),
    loadAsync: () => Promise.resolve(),
    downloadAsync: () => Promise.resolve(),
  },
  AssetModule: {
    fromModule: () => Promise.resolve({ uri: 'web-asset' }),
  },
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

// Stub for react-native-mmkv
export const reactNativeMmkv = {
  MMKV: class {
    constructor() {}
    set() {}
    get() { return null; }
    delete() {}
    clearAll() {}
  },
  createMMKV: () => new reactNativeMmkv.MMKV(),
};

// Default export for modules that use default exports
export default {
  posthog,
  expoApplication,
  expoConstants,
  expoAsset,
  expoDevice,
  sentryExpo,
  reactNativeLibraries,
  reactNativeMmkv,
  // Add any other exports that might be needed
  Application: expoApplication,
  Constants: expoConstants,
  Asset: expoAsset,
  Device: expoDevice,
  Sentry: sentryExpo,
  MMKV: reactNativeMmkv.MMKV,
  createMMKV: reactNativeMmkv.createMMKV,
};