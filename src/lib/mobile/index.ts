/**
 * Mobile compatibility layer for iOS app development
 * Handles native mobile features and platform-specific optimizations
 */

import { isMobile, isIOS, isAndroid, platformLog, getCurrentPlatformConfig } from '@/lib/platform';

// Mobile-specific location configuration
export const mobileLocationConfig = {
  ios: {
    // iOS-specific geolocation settings
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 60000,
    // iOS permission handling
    requestPermissionOnMount: true,
    showPermissionRationale: true,
    // iOS performance optimizations
    useSignificantLocationChanges: false, // For background location
    pauseLocationUpdatesAutomatically: true,
    activityType: 'other' as const // fitness, navigation, other
  },
  android: {
    // Android-specific geolocation settings
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 45000,
    // Android permission handling
    requestPermissionOnMount: true,
    showPermissionRationale: true,
    // Android performance optimizations
    fastestInterval: 5000,
    priority: 'PRIORITY_HIGH_ACCURACY' as const
  }
};

// Get mobile platform config
export const getMobileConfig = () => {
  if (isIOS) return mobileLocationConfig.ios;
  if (isAndroid) return mobileLocationConfig.android;
  return mobileLocationConfig.ios; // Default to iOS
};

// Mobile storage adapter using AsyncStorage/MMKV
export const getMobileStorageAdapter = () => {
  // In actual mobile implementation, this would use:
  // - AsyncStorage for React Native
  // - MMKV for high-performance storage
  // - Secure storage for sensitive data
  
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        // Mobile implementation would use AsyncStorage.getItem(key)
        if (typeof window !== 'undefined') {
          return localStorage.getItem(key);
        }
        return null;
      } catch (error) {
        platformLog.error('Mobile storage getItem error:', error);
        return null;
      }
    },
    
    async setItem(key: string, value: string): Promise<void> {
      try {
        // Mobile implementation would use AsyncStorage.setItem(key, value)
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch (error) {
        platformLog.error('Mobile storage setItem error:', error);
      }
    },
    
    async removeItem(key: string): Promise<void> {
      try {
        // Mobile implementation would use AsyncStorage.removeItem(key)
        if (typeof window !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (error) {
        platformLog.error('Mobile storage removeItem error:', error);
      }
    },
    
    async multiGet(keys: string[]): Promise<Array<[string, string | null]>> {
      try {
        // Mobile implementation would use AsyncStorage.multiGet(keys)
        const results: Array<[string, string | null]> = [];
        for (const key of keys) {
          const value = await this.getItem(key);
          results.push([key, value]);
        }
        return results;
      } catch (error) {
        platformLog.error('Mobile storage multiGet error:', error);
        return [];
      }
    }
  };
};

// Mobile haptic feedback
export const mobileHaptics = {
  light: () => {
    if (isMobile) {
      // Mobile implementation would use Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      platformLog.debug('Light haptic feedback');
    }
  },
  
  medium: () => {
    if (isMobile) {
      // Mobile implementation would use Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      platformLog.debug('Medium haptic feedback');
    }
  },
  
  heavy: () => {
    if (isMobile) {
      // Mobile implementation would use Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      platformLog.debug('Heavy haptic feedback');
    }
  },
  
  success: () => {
    if (isMobile) {
      // Mobile implementation would use Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      platformLog.debug('Success haptic feedback');
    }
  },
  
  warning: () => {
    if (isMobile) {
      // Mobile implementation would use Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      platformLog.debug('Warning haptic feedback');
    }
  },
  
  error: () => {
    if (isMobile) {
      // Mobile implementation would use Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      platformLog.debug('Error haptic feedback');
    }
  }
};

// Mobile location permissions
export const mobileLocationPermissions = {
  async requestPermission(): Promise<'granted' | 'denied' | 'restricted'> {
    if (!isMobile) {
      return 'granted'; // Web doesn't need explicit permission request
    }
    
    try {
      // Mobile implementation would use expo-location or react-native-permissions
      // For now, simulate permission request
      platformLog.debug('Requesting location permission');
      
      // In actual mobile app, this would be:
      // const { status } = await Location.requestForegroundPermissionsAsync();
      // return status === 'granted' ? 'granted' : 'denied';
      
      return 'granted';
    } catch (error) {
      platformLog.error('Permission request error:', error);
      return 'denied';
    }
  },
  
  async checkPermission(): Promise<'granted' | 'denied' | 'restricted' | 'undetermined'> {
    if (!isMobile) {
      // For web, check navigator permissions
      if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          return result.state === 'granted' ? 'granted' : 'denied';
        } catch {
          return 'undetermined';
        }
      }
      return 'undetermined';
    }
    
    try {
      // Mobile implementation would use expo-location or react-native-permissions
      platformLog.debug('Checking location permission');
      
      // In actual mobile app, this would be:
      // const { status } = await Location.getForegroundPermissionsAsync();
      // return status;
      
      return 'undetermined';
    } catch (error) {
      platformLog.error('Permission check error:', error);
      return 'undetermined';
    }
  },
  
  async openSettings(): Promise<void> {
    if (isMobile) {
      // Mobile implementation would use Linking.openSettings() or similar
      platformLog.debug('Opening app settings for location permission');
    }
  }
};

// Mobile network status
export const mobileNetworkStatus = {
  async getNetworkState(): Promise<{
    isConnected: boolean;
    type: 'wifi' | 'cellular' | 'unknown';
    isInternetReachable: boolean;
  }> {
    if (!isMobile) {
      // Web implementation using navigator.onLine
      return {
        isConnected: navigator.onLine,
        type: 'unknown',
        isInternetReachable: navigator.onLine
      };
    }
    
    try {
      // Mobile implementation would use @react-native-community/netinfo
      // const netInfo = await NetInfo.fetch();
      // return {
      //   isConnected: netInfo.isConnected ?? false,
      //   type: netInfo.type === 'wifi' ? 'wifi' : 'cellular',
      //   isInternetReachable: netInfo.isInternetReachable ?? false
      // };
      
      return {
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true
      };
    } catch (error) {
      platformLog.error('Network state error:', error);
      return {
        isConnected: false,
        type: 'unknown',
        isInternetReachable: false
      };
    }
  }
};

// Mobile app state
export const mobileAppState = {
  getCurrentState(): 'active' | 'background' | 'inactive' {
    if (!isMobile) {
      return document.visibilityState === 'visible' ? 'active' : 'background';
    }
    
    // Mobile implementation would use AppState from react-native
    // return AppState.currentState;
    return 'active';
  },
  
  addEventListener(callback: (state: 'active' | 'background' | 'inactive') => void) {
    if (!isMobile) {
      // Web implementation using visibility API
      const handler = () => {
        callback(document.visibilityState === 'visible' ? 'active' : 'background');
      };
      document.addEventListener('visibilitychange', handler);
      return () => document.removeEventListener('visibilitychange', handler);
    }
    
    // Mobile implementation would use AppState.addEventListener
    // return AppState.addEventListener('change', callback);
    return () => {}; // No-op cleanup
  }
};

// Export mobile helpers
export const mobileHelpers = {
  config: getMobileConfig(),
  storage: getMobileStorageAdapter(),
  haptics: mobileHaptics,
  permissions: mobileLocationPermissions,
  network: mobileNetworkStatus,
  appState: mobileAppState,
  
  // Platform checks
  isMobile,
  isIOS,
  isAndroid,
  
  // Utilities
  log: platformLog
};

// Initialize mobile compatibility
if (isMobile) {
  platformLog.debug('Mobile compatibility initialized for iOS app development');
}