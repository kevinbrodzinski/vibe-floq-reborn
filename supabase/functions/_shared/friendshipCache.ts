// Deno edge in-memory cache for friendship lookups (per isolate).
// - TTL (ms): default 60s
// - Size cap: default 5k profiles (LRU trim)
// - In-flight dedupe: prevents thundering herds

type AudienceSets = {
  close: Set<string>;
  friends: Set<string>;
};

type CacheEntry = {
  value: AudienceSets;
  expiresAt: number;
  // simple LRU stamp
  lastAccess: number;
};

type Fetcher = (supabase: any, profileId: string) => Promise<AudienceSets>;

const DEFAULT_TTL_MS = 60_000;
const MAX_ENTRIES = 5_000;

class FriendshipCache {
  private store = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<AudienceSets>>();
  private ttl = DEFAULT_TTL_MS;

  constructor(ttlMs?: number) {
    if (ttlMs && ttlMs > 5_000) this.ttl = ttlMs; // guard silly values
  }

  // Main entrypoint
  async getSets(supabase: any, profileId: string, fetcher?: Fetcher): Promise<AudienceSets> {
    if (!profileId) return this.empty();

    // fast path: fresh cache
    const now = Date.now();
    const hit = this.store.get(profileId);
    if (hit && hit.expiresAt > now) {
      hit.lastAccess = now;
      return hit.value;
    }

    // in-flight dedupe
    const inflightKey = profileId;
    const inflight = this.inflight.get(inflightKey);
    if (inflight) return inflight;

    // fetch
    const task = (fetcher ?? this.defaultFetch).call(this, supabase, profileId)
      .catch(() => this.empty())
      .then((value) => {
        this.inflight.delete(inflightKey);
        this.put(profileId, value);
        return value;
      });

    this.inflight.set(inflightKey, task);
    return task;
  }

  // Default Supabase fetch (adjust if your schema differs)
  private async defaultFetch(supabase: any, profileId: string): Promise<AudienceSets> {
    // SELECT minimal columns only
    const { data, error } = await supabase
      .from("friendships")
      .select("profile_low,profile_high,friend_state")
      .or(`profile_low.eq.${profileId},profile_high.eq.${profileId}`)
      .eq('friend_state', 'accepted');

    if (error || !data?.length) return this.empty();

    const close = new Set<string>();
    const friends = new Set<string>();

    for (const row of data) {
      const other = row.profile_low === profileId ? row.profile_high : row.profile_low;
      if (!other) continue;
      
      // For now, treat all accepted friendships as 'friends' level
      // TODO: Add relationship strength/level column to distinguish close vs friends
      friends.add(other);
      
      // You can add logic here to determine 'close' relationships
      // For example, based on interaction frequency or explicit marking
      // For now, we'll leave close empty and populate friends only
    }
    
    return { close, friends };
  }

  private put(key: string, value: AudienceSets) {
    const now = Date.now();
    this.store.set(key, { value, expiresAt: now + this.ttl, lastAccess: now });
    // LRU trim if over capacity
    if (this.store.size > MAX_ENTRIES) {
      const arr = Array.from(this.store.entries());
      arr.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      const toDrop = arr.slice(0, Math.ceil(this.store.size * 0.1)); // drop 10%
      for (const [k] of toDrop) this.store.delete(k);
    }
  }

  clear() { this.store.clear(); }
  empty(): AudienceSets { return { close: new Set(), friends: new Set() }; }
}

// Export a singleton (one per Deno isolate)
export const friendshipCache = new FriendshipCache(DEFAULT_TTL_MS);