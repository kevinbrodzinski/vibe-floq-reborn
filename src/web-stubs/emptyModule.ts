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

// Sentry removed for better Lovable compatibility

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

// Stub for @react-native-async-storage/async-storage
export const asyncStorage = {
  getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
  removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
  clear: () => Promise.resolve(localStorage.clear()),
  getAllKeys: () => Promise.resolve(Object.keys(localStorage)),
  multiGet: (keys: string[]) => Promise.resolve(keys.map(key => [key, localStorage.getItem(key)])),
  multiSet: (keyValuePairs: [string, string][]) => {
    keyValuePairs.forEach(([key, value]) => localStorage.setItem(key, value));
    return Promise.resolve();
  },
  multiRemove: (keys: string[]) => {
    keys.forEach(key => localStorage.removeItem(key));
    return Promise.resolve();
  }
};

// Stub for expo-haptics
export const expoHaptics = {
  impactAsync: (style?: string) => Promise.resolve(),
  notificationAsync: (type?: string) => Promise.resolve(),
  selectionAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy'
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error'
  }
};

// Default export for modules that use default exports
export default {
  posthog,
  expoApplication,
  expoConstants,
  expoAsset,
  expoDevice,
  reactNativeLibraries,
  reactNativeMmkv,
  asyncStorage,
  expoHaptics,
  // Add any other exports that might be needed
  Application: expoApplication,
  Constants: expoConstants,
  Asset: expoAsset,
  Device: expoDevice,
  MMKV: reactNativeMmkv.MMKV,
  createMMKV: reactNativeMmkv.createMMKV,
  AsyncStorage: asyncStorage,
  Haptics: expoHaptics,
  // Common export patterns
  getItem: asyncStorage.getItem,
  setItem: asyncStorage.setItem,
  removeItem: asyncStorage.removeItem,
  impactAsync: expoHaptics.impactAsync,
  notificationAsync: expoHaptics.notificationAsync,
};