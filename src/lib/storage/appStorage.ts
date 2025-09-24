export type StorageLike = {
  getItem(k: string): Promise<string | null>
  setItem(k: string, v: string): Promise<void>
  removeItem(k: string): Promise<void>
}

let storage: StorageLike

if (typeof window !== 'undefined' && window.localStorage) {
  storage = {
    async getItem(k) { return window.localStorage.getItem(k) },
    async setItem(k, v) { window.localStorage.setItem(k, v) },
    async removeItem(k) { window.localStorage.removeItem(k) },
  }
} else {
  try {
    // @ts-ignore
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    storage = {
      async getItem(k) { return await AsyncStorage.getItem(k) },
      async setItem(k, v) { await AsyncStorage.setItem(k, v) },
      async removeItem(k) { await AsyncStorage.removeItem(k) },
    }
  } catch {
    const mem = new Map<string,string>()
    storage = {
      async getItem(k){ return mem.get(k) ?? null },
      async setItem(k,v){ mem.set(k,v) },
      async removeItem(k){ mem.delete(k) },
    }
  }
}

export default storage