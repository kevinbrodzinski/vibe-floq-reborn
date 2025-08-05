/**
 * SSR-safe localStorage wrapper to prevent hydration mismatches
 * Works in both browser and server environments (like Lovable preview)
 */

interface SafeStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  getAllKeys: () => string[];
}

/**
 * Check if we're in a browser environment with localStorage available
 */
const isStorageAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * In-memory fallback storage for when localStorage is unavailable
 */
class MemoryStorage implements SafeStorage {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  getAllKeys(): string[] {
    return Array.from(this.storage.keys());
  }
}

/**
 * Browser localStorage wrapper with error handling
 */
class BrowserStorage implements SafeStorage {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get item "${key}" from localStorage:`, error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Failed to set item "${key}" in localStorage:`, error);
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove item "${key}" from localStorage:`, error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  getAllKeys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.warn('Failed to get localStorage keys:', error);
      return [];
    }
  }
}

/**
 * Create the appropriate storage instance based on environment
 */
const createSafeStorage = (): SafeStorage => {
  if (isStorageAvailable()) {
    return new BrowserStorage();
  }
  return new MemoryStorage();
};

/**
 * SSR-safe localStorage with automatic fallback to memory storage
 */
export const safeStorage = createSafeStorage();

/**
 * Hook-like helper for getting/setting values with JSON parsing
 */
export const safeStorageHelpers = {
  /**
   * Get and parse JSON value from storage
   */
  getJSON: <T>(key: string, defaultValue: T): T => {
    try {
      const item = safeStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to parse JSON for key "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * Stringify and store JSON value
   */
  setJSON: <T>(key: string, value: T): void => {
    try {
      safeStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to stringify JSON for key "${key}":`, error);
    }
  },

  /**
   * Get string value with fallback
   */
  getString: (key: string, defaultValue = ''): string => {
    return safeStorage.getItem(key) || defaultValue;
  },

  /**
   * Check if a key exists in storage
   */
  hasKey: (key: string): boolean => {
    return safeStorage.getItem(key) !== null;
  }
};

/**
 * Legacy compatibility - drop-in replacement for direct localStorage usage
 */
export const safeLegacyStorage = {
  getItem: safeStorage.getItem.bind(safeStorage),
  setItem: safeStorage.setItem.bind(safeStorage),
  removeItem: safeStorage.removeItem.bind(safeStorage),
  clear: safeStorage.clear.bind(safeStorage)
}; 