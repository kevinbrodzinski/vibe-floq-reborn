import { storage } from '@/lib/storage';
import type { ContextFactWithId } from './types';

/**
 * Context Truth Ledger - Immutable fact storage with hash chain verification
 * Forms the foundation of the Context AI system
 */
export class ContextTruthLedger {
  private static readonly STORAGE_KEY = 'floq:context:ledger:v1';
  private static readonly HASH_CHAIN_KEY = 'floq:context:hash_chain:v1';
  private static readonly MAX_FACTS = 2000;
  
  private facts: ContextFactWithId[] = [];
  private hashChain: string[] = [];
  private factIndex = new Map<string, ContextFactWithId[]>();

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.facts = await storage.getJSON(ContextTruthLedger.STORAGE_KEY) || [];
      this.hashChain = await storage.getJSON(ContextTruthLedger.HASH_CHAIN_KEY) || [];
      this.rebuildIndex();
    } catch (error) {
      console.warn('Failed to initialize Context Truth Ledger:', error);
    }
  }

  async append(fact: Omit<ContextFactWithId, 'id' | 'timestamp' | 'hash'>): Promise<string> {
    const prevHash = this.hashChain[this.hashChain.length - 1] || '0';
    const factId = crypto.randomUUID();
    const timestamp = Date.now();
    
    const factWithMetadata: ContextFactWithId = {
      ...fact,
      id: factId,
      timestamp,
      hash: await this.computeHash({
        ...fact,
        id: factId,
        timestamp,
        prevHash
      })
    };

    this.facts.push(factWithMetadata);
    this.hashChain.push(factWithMetadata.hash!);
    
    // Maintain ring buffer
    if (this.facts.length > ContextTruthLedger.MAX_FACTS) {
      const removed = this.facts.shift();
      if (removed) {
        this.removeFromIndex(removed);
      }
    }
    
    this.indexFact(factWithMetadata);
    await this.persist();
    
    // Emit fact added event for subscribers
    this.emitFactAdded(factWithMetadata);
    
    return factId;
  }

  async getRecent(limit: number = 100): Promise<ContextFactWithId[]> {
    await this.initialize();
    return this.facts.slice(-limit);
  }

  async getByType(type: ContextFactWithId['type'], limit: number = 50): Promise<ContextFactWithId[]> {
    await this.initialize();
    const typeFacts = this.factIndex.get(type) || [];
    return typeFacts.slice(-limit);
  }

  async getInTimeWindow(windowMs: number): Promise<ContextFactWithId[]> {
    await this.initialize();
    const cutoff = Date.now() - windowMs;
    return this.facts.filter(f => f.timestamp > cutoff);
  }

  async verify(factId: string): Promise<boolean> {
    const fact = this.facts.find(f => f.id === factId);
    if (!fact || !fact.hash) return false;

    const factIndex = this.facts.indexOf(fact);
    const prevHash = factIndex > 0 ? this.hashChain[factIndex - 1] : '0';
    
    const computedHash = await this.computeHash({
      ...fact,
      prevHash
    });
    
    return computedHash === fact.hash;
  }

  async getCount(): Promise<number> {
    await this.initialize();
    return this.facts.length;
  }

  private async computeHash(data: any): Promise<string> {
    const content = JSON.stringify({
      type: data.type,
      data: data.data,
      timestamp: data.timestamp,
      prevHash: data.prevHash || '0'
    });
    
    const encoder = new TextEncoder();
    const buffer = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private indexFact(fact: ContextFactWithId): void {
    if (!this.factIndex.has(fact.type)) {
      this.factIndex.set(fact.type, []);
    }
    this.factIndex.get(fact.type)!.push(fact);
  }

  private removeFromIndex(fact: ContextFactWithId): void {
    const typeFacts = this.factIndex.get(fact.type);
    if (typeFacts) {
      const index = typeFacts.findIndex(f => f.id === fact.id);
      if (index > -1) {
        typeFacts.splice(index, 1);
      }
    }
  }

  private rebuildIndex(): void {
    this.factIndex.clear();
    this.facts.forEach(fact => this.indexFact(fact));
  }

  private async persist(): Promise<void> {
    try {
      await Promise.all([
        storage.setJSON(ContextTruthLedger.STORAGE_KEY, this.facts),
        storage.setJSON(ContextTruthLedger.HASH_CHAIN_KEY, this.hashChain)
      ]);
    } catch (error) {
      console.warn('Failed to persist Context Truth Ledger:', error);
    }
  }

  private emitFactAdded(fact: ContextFactWithId): void {
    window.dispatchEvent(new CustomEvent('context:fact_added', {
      detail: fact
    }));
  }
}