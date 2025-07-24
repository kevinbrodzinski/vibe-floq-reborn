/* ---------------------------------------------------------------------
   Cross-platform storage utility
--------------------------------------------------------------------- */

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
  clearAuthStorage(): Promise<void>;
}

/* ---------- Web adapter ------------------------------------------------ */

class WebStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try { return typeof window !== 'undefined' ? localStorage.getItem(key) : null; }
    catch (err) { console.warn('[Storage] getItem failed', err); return null; }
  }

  async setItem(key: string, value: string): Promise<void> {
    try { if (typeof window !== 'undefined') localStorage.setItem(key, value); }
    catch (err) { console.warn('[Storage] setItem failed', err); }
  }

  async removeItem(key: string): Promise<void> {
    try { if (typeof window !== 'undefined') localStorage.removeItem(key); }
    catch (err) { console.warn('[Storage] removeItem failed', err); }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      if (typeof window === 'undefined') return [];
      return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(Boolean);
    } catch (err) { console.warn('[Storage] getAllKeys failed', err); return []; }
  }

  async clear(): Promise<void> {
    try { if (typeof window !== 'undefined') localStorage.clear(); }
    catch (err) { console.warn('[Storage] clear failed', err); }
  }

  async clearAuthStorage(): Promise<void> {
    const keys = await this.getAllKeys();
    const authPattern = /^(sb-|.*auth.*|.*session.*|sb-access-token|floq_)/;
    await Promise.all(keys.filter(k => authPattern.test(k)).map(k => this.removeItem(k)));
  }
}

/* ---------- Memory fallback (SSR / RN dev) ----------------------------- */

class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  async getItem(k: string): Promise<string | null> { return this.store.get(k) ?? null; }
  async setItem(k: string, v: string): Promise<void> { this.store.set(k, v); }
  async removeItem(k: string): Promise<void> { this.store.delete(k); }
  async getAllKeys(): Promise<string[]> { return [...this.store.keys()]; }
  async clear(): Promise<void> { this.store.clear(); }
  async clearAuthStorage(): Promise<void> { await this.clear(); }
}

/* ---------- Adapter selector ------------------------------------------ */

const storageAdapter: StorageAdapter =
  typeof window !== 'undefined' && 'localStorage' in window
    ? new WebStorageAdapter()
    : new MemoryStorageAdapter();

/* ---------- Public API ------------------------------------------------- */

export const storage = {
  /* primitives --------------------------------------------------------- */
  getItem(key: string): Promise<string | null> {
    return storageAdapter.getItem(key);
  },
  setItem(key: string, v: string): Promise<void> {
    return storageAdapter.setItem(key, v);
  },
  removeItem(key: string): Promise<void> {
    return storageAdapter.removeItem(key);
  },
  getAllKeys(): Promise<string[]> {
    return storageAdapter.getAllKeys();
  },
  clear(): Promise<void> {
    return storageAdapter.clear();
  },

  /* helpers ------------------------------------------------------------ */
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await storageAdapter.getItem(key);
    try { return raw ? JSON.parse(raw) as T : null; }
    catch (e) { console.warn('[Storage] JSON parse failed', e); return null; }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    try { await storageAdapter.setItem(key, JSON.stringify(value)); }
    catch (e) { console.warn('[Storage] JSON stringify failed', e); }
  },

  async removeByPattern(rx: RegExp): Promise<void> {
    const keys = await storageAdapter.getAllKeys();
    await Promise.all(keys.filter(k => rx.test(k)).map(k => storageAdapter.removeItem(k)));
  },

  clearAuthStorage(): Promise<void> { return storageAdapter.clearAuthStorage(); }
};