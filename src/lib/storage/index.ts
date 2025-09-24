/**
 * Cross-platform storage adapter
 * Uses localStorage on web, AsyncStorage on React Native
 */
export const storage = {
  async getItem(k: string): Promise<string | null> {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(k);
    }
    
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      return AsyncStorage.getItem(k);
    } catch {
      return null;
    }
  },
  
  async setItem(k: string, v: string): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(k, v);
      return;
    }
    
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem(k, v);
    } catch {
      // Fail silently
    }
  },
  
  async removeItem(k: string): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(k);
      return;
    }
    
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.removeItem(k);
    } catch {
      // Fail silently
    }
  },

  // JSON helpers for pattern storage
  async getJSON<T>(key: string, fallback: T): Promise<T> {
    try {
      const stored = await this.getItem(key);
      if (!stored) return fallback;
      return JSON.parse(stored);
    } catch {
      return fallback;
    }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    try {
      await this.setItem(key, JSON.stringify(value));
    } catch {
      // Fail silently
    }
  }
};