// Web-safe MMKV stub that falls back to localStorage
class MMKVStub {
  constructor(options = {}) {
    this.id = options.id || 'default';
    this.prefix = `mmkv_${this.id}_`;
  }

  set(key, value) {
    try {
      const prefixedKey = this.prefix + key;
      if (typeof value === 'string') {
        localStorage.setItem(prefixedKey, value);
      } else {
        localStorage.setItem(prefixedKey, JSON.stringify(value));
      }
      return true;
    } catch {
      return false;
    }
  }

  getString(key) {
    try {
      return localStorage.getItem(this.prefix + key);
    } catch {
      return undefined;
    }
  }

  getNumber(key) {
    try {
      const value = localStorage.getItem(this.prefix + key);
      return value ? Number(value) : undefined;
    } catch {
      return undefined;
    }
  }

  getBoolean(key) {
    try {
      const value = localStorage.getItem(this.prefix + key);
      return value === 'true';
    } catch {
      return false;
    }
  }

  contains(key) {
    try {
      return localStorage.getItem(this.prefix + key) !== null;
    } catch {
      return false;
    }
  }

  delete(key) {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch {
      return false;
    }
  }

  getAllKeys() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.slice(this.prefix.length));
        }
      }
      return keys;
    } catch {
      return [];
    }
  }

  clearAll() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch {
      // ignore
    }
  }
}

export const MMKV = MMKVStub;
export default MMKVStub;