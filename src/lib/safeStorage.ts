// SSR/hydration-safe localStorage helpers
export function getLS(key: string, def: string | null = null): string | null {
  try { 
    return typeof window === 'undefined' ? def : (localStorage.getItem(key) ?? def); 
  } catch { 
    return def; 
  }
}

export function setLS(key: string, val: string): void {
  try { 
    if (typeof window !== 'undefined') localStorage.setItem(key, val); 
  } catch {}
}

export function removeLS(key: string): void {
  try { 
    if (typeof window !== 'undefined') localStorage.removeItem(key); 
  } catch {}
}

// JSON helpers for backward compatibility
export function getJSONLS<T>(key: string, def: T): T {
  try {
    const val = getLS(key);
    return val ? JSON.parse(val) : def;
  } catch {
    return def;
  }
}

export function setJSONLS<T>(key: string, val: T): void {
  try {
    setLS(key, JSON.stringify(val));
  } catch {}
}