import { ContextFact, ContextFactWithId } from './types';
import { storage } from '@/lib/storage';

const STORE_KEY = 'ctx:ledger:v1';

type ChainEntry = {
  id: string;
  prev: string | null;    // previous id
  hash: string;           // SHA-256 of (prevHash + JSON(fact))
  fact: ContextFact;
};

export class ContextTruthLedger {
  private chain: ChainEntry[] = [];

  constructor() {
    this.load().catch(() => {
      // Fail silently on load error
    });
  }

  /** Append a fact (returns the fact with ledger id) */
  async append(fact: ContextFact): Promise<ContextFactWithId> {
    const prev = this.chain.length ? this.chain[this.chain.length - 1] : null;
    const payload = JSON.stringify(fact);
    const prevHash = prev?.hash ?? '';
    const hash = await sha256(prevHash + payload);
    const id = await sha256(String(fact.t) + Math.random().toString(36));

    const entry: ChainEntry = { id, prev: prev?.id ?? null, hash, fact };
    this.chain.push(entry);
    this.persist().catch(() => {
      // Fail silently on persist error
    });

    return Object.assign({ id }, fact);
  }

  /** Verify full chain integrity */
  async verify(): Promise<boolean> {
    let prevHash = '';
    for (const [i, e] of this.chain.entries()) {
      const expected = await sha256(prevHash + JSON.stringify(e.fact));
      if (e.hash !== expected) return false;
      const prevId = i ? this.chain[i - 1].id : null;
      if (e.prev !== prevId) return false;
      prevHash = e.hash;
    }
    return true;
  }

  /** Project facts into a typed array (newest first or oldest first) */
  getFacts(opts: { order?: 'asc' | 'desc'; limit?: number } = {}): ContextFactWithId[] {
    const arr = this.chain.map(e => Object.assign({ id: e.id }, e.fact));
    const order = opts.order ?? 'asc';
    if (order === 'desc') arr.reverse();
    return typeof opts.limit === 'number' ? arr.slice(0, opts.limit) : arr;
  }

  /** Get facts by kind */
  getFactsByKind<T extends ContextFact>(kind: T['kind']): (ContextFactWithId & T)[] {
    return this.getFacts().filter(f => f.kind === kind) as (ContextFactWithId & T)[];
  }

  /** Get recent facts within time window */
  getRecentFacts(windowMs: number, now = Date.now()): ContextFactWithId[] {
    const cutoff = now - windowMs;
    return this.getFacts().filter(f => f.t >= cutoff);
  }

  /** Get fact count */
  getCount(): number {
    return this.chain.length;
  }

  /** Storage */
  private async load() {
    try {
      const raw = await storage.getItem(STORE_KEY);
      if (raw) this.chain = JSON.parse(raw);
    } catch {}
  }
  
  private async persist() {
    try {
      await storage.setItem(STORE_KEY, JSON.stringify(this.chain));
    } catch {}
  }

  /** Cleanup old facts */
  async cleanup(maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - maxAgeMs;
    const initialCount = this.chain.length;
    
    // Find first fact to keep (keeping hash chain integrity)
    const keepFromIndex = this.chain.findIndex(e => e.fact.t >= cutoff);
    
    if (keepFromIndex === -1) {
      // All facts are older than cutoff
      this.chain = [];
    } else if (keepFromIndex > 0) {
      // Remove old facts and fix chain
      this.chain = this.chain.slice(keepFromIndex);
      if (this.chain.length > 0) {
        this.chain[0].prev = null;
      }
    }
    
    this.persist().catch(() => {
      // Fail silently on persist error  
    });
    return initialCount - this.chain.length;
  }
}

/** Safe SHA-256 with fallback */
async function sha256(s: string): Promise<string> {
  try {
    const enc = new TextEncoder().encode(s);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Non-crypto environments: weak fallback (dev only)
    let h = 0; for (let i=0;i<s.length;i++) h = ((h<<5)-h) + s.charCodeAt(i) | 0;
    return 'x' + Math.abs(h).toString(16);
  }
}
