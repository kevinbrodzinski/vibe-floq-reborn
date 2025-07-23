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
    const keys = await this.getAllKeys();
    const authPattern = /^(sb-|.*auth.*|.*session.*|sb-access-token|floq_)/;
    await Promise.all(keys.filter(k => authPattern.test(k)).map(k => this.removeItem(k)));
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
    console.info('[Storage] Using in-memory adapter');
  }

  async clearAuthStorage(): Promise<void> {
    const keys = await this.getAllKeys();
    const authPattern = /^(sb-|.*auth.*|.*session.*|sb-access-token|floq_)/;
    await Promise.all(keys.filter(k => authPattern.test(k)).map(k => this.removeItem(k)));
  }
}

// Platform detection and adapter selection
function createStorageAdapter(): StorageAdapter {
  // If you're already on web just return WebStorageAdapter
  if (typeof window !== 'undefined') return new WebStorageAdapter();

  // RN fallback – until SecureStore adapter is coded, use memory adapter
  console.warn('[Storage] Falling back to in-memory adapter on native');
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
   * Clear auth-related storage (uses Promise.all for performance)
   */
  async clearAuthStorage(): Promise<void> {
    return storageAdapter.clearAuthStorage();
  }
};