/**
 * Cross-platform storage utility for web and React Native
 * Handles localStorage on web and AsyncStorage/SecureStore on mobile
 */

interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
  clearAuthStorage(): Promise<void>;
}

class WebStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.warn(`[Storage] Failed to get item ${key}:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn(`[Storage] Failed to set item ${key}:`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`[Storage] Failed to remove item ${key}:`, error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) keys.push(key);
        }
        return keys;
      }
      return [];
    } catch (error) {
      console.warn('[Storage] Failed to get all keys:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    } catch (error) {
      console.warn('[Storage] Failed to clear storage:', error);
    }
  }

  async clearAuthStorage(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keys = Object.keys(localStorage);
      const authKeys = keys.filter(key => 
        key.startsWith('sb-') || 
        key.includes('auth') || 
        key.includes('session') ||
        key.includes('sb-access-token') ||
        key.startsWith('floq_auth') ||
        key.startsWith('floq_onboarding')
      );
      authKeys.forEach(key => localStorage.removeItem(key));
    }
  }
}

// Memory fallback for when storage is unavailable
class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async clearAuthStorage(): Promise<void> {
    const keys = Array.from(this.storage.keys());
    const authKeys = keys.filter(key => 
      key.startsWith('sb-') || 
      key.includes('auth') || 
      key.includes('session') ||
      key.includes('sb-access-token') ||
      key.startsWith('floq_auth') ||
      key.startsWith('floq_onboarding')
    );
    authKeys.forEach(key => this.storage.delete(key));
    console.info('[Storage] Using in-memory adapter');
  }
}

// React Native storage adapter (throws for now - better than silent data loss)
class ReactNativeStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    throw new Error('React Native storage not implemented yet. Use expo-secure-store.');
  }
  async setItem(key: string, value: string): Promise<void> {
    throw new Error('React Native storage not implemented yet. Use expo-secure-store.');
  }
  async removeItem(key: string): Promise<void> {
    throw new Error('React Native storage not implemented yet. Use expo-secure-store.');
  }
  async getAllKeys(): Promise<string[]> {
    throw new Error('React Native storage not implemented yet. Use expo-secure-store.');
  }
  async clear(): Promise<void> {
    throw new Error('React Native storage not implemented yet. Use expo-secure-store.');
  }
  async clearAuthStorage(): Promise<void> {
    throw new Error('React Native storage not implemented yet. Use expo-secure-store.');
  }
}

// Platform detection and adapter selection
function createStorageAdapter(): StorageAdapter {
  // TODO: Add React Native detection when implementing mobile
  // if (Platform.OS === 'ios' || Platform.OS === 'android') {
  //   return new ReactNativeStorageAdapter();
  // }
  
  try {
    // Test if localStorage is available (guard window access)
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return new WebStorageAdapter();
    }
  } catch {
    // localStorage not available, use memory fallback
  }
  
  console.info('[Storage] Using in-memory adapter - data will not persist');
  return new MemoryStorageAdapter();
}

// Singleton storage instance
const storageAdapter = createStorageAdapter();

/**
 * Cross-platform storage API
 */
export const storage = {
  /**
   * Get an item from storage
   */
  async getItem(key: string): Promise<string | null> {
    return storageAdapter.getItem(key);
  },

  /**
   * Set an item in storage
   */
  async setItem(key: string, value: string): Promise<void> {
    return storageAdapter.setItem(key, value);
  },

  /**
   * Remove an item from storage
   */
  async removeItem(key: string): Promise<void> {
    return storageAdapter.removeItem(key);
  },

  /**
   * Get all keys in storage
   */
  async getAllKeys(): Promise<string[]> {
    return storageAdapter.getAllKeys();
  },

  /**
   * Clear all items from storage
   */
  async clear(): Promise<void> {
    return storageAdapter.clear();
  },

  /**
   * Get and parse JSON data
   */
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await this.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn(`[Storage] Failed to parse JSON for ${key}:`, error);
      return null;
    }
  },

  /**
   * Set JSON data
   */
  async setJSON<T>(key: string, value: T): Promise<void> {
    try {
      await this.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[Storage] Failed to stringify JSON for ${key}:`, error);
    }
  },

  /**
   * Remove multiple items by pattern
   */
  async removeByPattern(pattern: RegExp): Promise<void> {
    try {
      const keys = await this.getAllKeys();
      const keysToRemove = keys.filter(key => pattern.test(key));
      
      await Promise.all(
        keysToRemove.map(key => this.removeItem(key))
      );
    } catch (error) {
      console.warn('[Storage] Failed to remove items by pattern:', error);
    }
  },

  /**
   * Clear auth-related storage (includes Supabase v2 tokens)
   */
  async clearAuthStorage(): Promise<void> {
    const authPatterns = [
      /^supabase\.auth\./,
      /^sb-/,
      /^sb-access-token$/,  // Supabase v2 token
      /^flq_/,  // Use consistent prefix
      /^floq_/,
      /^auth_/
    ];

    for (const pattern of authPatterns) {
      await this.removeByPattern(pattern);
    }
  }
};

/**
 * Platform-safe navigation utilities
 */
export const navigation = {
  /**
   * Navigate to a URL (web) or route (mobile)
   */
  navigate(path: string): void {
    try {
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = path;
      }
      // TODO: Add React Native navigation when implementing mobile
      // else if (Platform.OS === 'ios' || Platform.OS === 'android') {
      //   // Use React Navigation
      //   navigationRef.navigate(path);
      // }
    } catch (error) {
      console.warn('[Navigation] Failed to navigate to:', path, error);
    }
  },

  /**
   * Reload the current page/screen
   */
  reload(): void {
    try {
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
      // TODO: Add React Native screen refresh when implementing mobile
    } catch (error) {
      console.warn('[Navigation] Failed to reload:', error);
    }
  },

  /**
   * Get current URL (web only)
   */
  getCurrentURL(): string {
    try {
      if (typeof window !== 'undefined' && window.location) {
        return window.location.href;
      }
      return '';
    } catch (error) {
      console.warn('[Navigation] Failed to get current URL:', error);
      return '';
    }
  }
};