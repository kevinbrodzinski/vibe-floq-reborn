type CacheEntry<T> = { v: T; t: number; ttl: number; etag?: string };
const mem = new Map<string, CacheEntry<any>>();
const inflight = new Map<string, Promise<any>>();

export function getCached<T>(k: string): T | null {
  const e = mem.get(k); 
  if (!e) return null;
  if (Date.now() - e.t > e.ttl) { 
    mem.delete(k); 
    return null; 
  }
  return e.v as T;
}

export function setCached<T>(k: string, v: T, ttlMs: number, etag?: string) {
  mem.set(k, { v, t: Date.now(), ttl: ttlMs, etag });
}

export function getEtag(k: string) { 
  return mem.get(k)?.etag; 
}

export function coalesce<T>(k: string, job: () => Promise<T>): Promise<T> {
  const p = inflight.get(k); 
  if (p) return p;
  const run = job().finally(() => inflight.delete(k));
  inflight.set(k, run); 
  return run;
}