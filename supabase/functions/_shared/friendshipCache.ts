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

  /** Main entrypoint (in-flight dedupe + LRU + TTL) */
  async getSets(
    supabase: any,
    profileId: string,
    fetcher?: Fetcher
  ): Promise<AudienceSets> {
    if (!profileId) return this.empty();

    // Fast path: fresh cache
    const now = Date.now();
    const hit = this.store.get(profileId);
    if (hit && hit.expiresAt > now) {
      hit.lastAccess = now;
      return hit.value;
    }

    // In-flight dedupe
    const inflightKey = profileId;
    const inflight = this.inflight.get(inflightKey);
    if (inflight) return inflight;

    // Fetch → cache → resolve
    const task = (fetcher ?? this.defaultFetch)
      .call(this, supabase, profileId)
      .catch(() => this.empty())
      .then((value) => {
        this.inflight.delete(inflightKey);
        this.put(profileId, value);
        return value;
      });

    this.inflight.set(inflightKey, task);
    return task;
  }

  /** Default DB fetch (adjust column names to your schema once) */
  private async defaultFetch(
    supabase: any,
    profileId: string
  ): Promise<AudienceSets> {
    // Schema: friendships(profile_low uuid, profile_high uuid, friend_state text)
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

      // Could extend with relationship strength/level column
      // For now, treat all accepted friendships as 'friends' level
      friends.add(other);
      
      // Future: add logic for 'close' based on interaction frequency
      // or explicit relationship level column
    }
    
    return { close, friends };
  }

  /** Insert into cache and LRU-trim if needed */
  private put(key: string, value: AudienceSets) {
    const now = Date.now();
    this.store.set(key, { value, expiresAt: now + this.ttl, lastAccess: now });

    if (this.store.size > MAX_ENTRIES) {
      // Drop the coldest 10%
      const arr = Array.from(this.store.entries());
      arr.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      const toDrop = arr.slice(0, Math.ceil(this.store.size * 0.1));
      for (const [k] of toDrop) this.store.delete(k);
    }
  }

  clear() { this.store.clear(); }
  empty(): AudienceSets { return { close: new Set(), friends: new Set() }; }
}

/** Singleton per Deno isolate */
export const friendshipCache = new FriendshipCache(DEFAULT_TTL_MS);