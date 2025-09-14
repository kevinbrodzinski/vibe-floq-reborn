import { storage } from '@/lib/storage';
import type { ContextFact, ContextFactWithId } from './types';

/**
 * Context Fact Store - tracks contextual events for AI learning
 * Builds on existing storage system for consistency
 */
export class ContextFactStore {
  private static readonly STORAGE_KEY = 'floq:context:facts:v1';
  private static readonly MAX_FACTS = 1000;
  private static readonly CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  /**
   * Append a new context fact
   */
  async append(fact: ContextFact): Promise<string> {
    try {
      const facts = await this.getFacts();
      const factWithId: ContextFactWithId = {
        ...fact,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        hash: await this.computeHash(fact)
      };
      
      facts.push(factWithId);
      
      // Ring buffer approach - keep only recent facts
      if (facts.length > ContextFactStore.MAX_FACTS) {
        facts.shift();
      }
      
      await storage.setJSON(ContextFactStore.STORAGE_KEY, facts);
      
      // Emit event for real-time listeners
      this.emitFactAdded(factWithId);
      
      return factWithId.id;
    } catch (error) {
      console.warn('Failed to append context fact:', error);
      throw error;
    }
  }
  
  /**
   * Get recent context facts
   */
  async getRecent(limit: number = 100): Promise<ContextFactWithId[]> {
    try {
      const facts = await this.getFacts();
      return facts.slice(-limit).reverse(); // Most recent first
    } catch (error) {
      console.warn('Failed to get recent facts:', error);
      return [];
    }
  }
  
  /**
   * Get facts by type
   */
  async getByType(type: ContextFact['type'], limit: number = 50): Promise<ContextFactWithId[]> {
    try {
      const facts = await this.getFacts();
      return facts
        .filter(f => f.type === type)
        .slice(-limit)
        .reverse();
    } catch (error) {
      console.warn('Failed to get facts by type:', error);
      return [];
    }
  }
  
  /**
   * Get facts within time window
   */
  async getInTimeWindow(windowMs: number): Promise<ContextFactWithId[]> {
    try {
      const facts = await this.getFacts();
      const cutoff = Date.now() - windowMs;
      return facts.filter(f => f.timestamp > cutoff);
    } catch (error) {
      console.warn('Failed to get facts in time window:', error);
      return [];
    }
  }
  
  /**
   * Clean up old facts
   */
  async cleanup(): Promise<number> {
    try {
      const facts = await this.getFacts();
      const cutoff = Date.now() - ContextFactStore.CLEANUP_INTERVAL;
      const filteredFacts = facts.filter(f => f.timestamp > cutoff);
      const removedCount = facts.length - filteredFacts.length;
      
      if (removedCount > 0) {
        await storage.setJSON(ContextFactStore.STORAGE_KEY, filteredFacts);
      }
      
      return removedCount;
    } catch (error) {
      console.warn('Failed to cleanup context facts:', error);
      return 0;
    }
  }
  
  /**
   * Get total fact count
   */
  async getCount(): Promise<number> {
    try {
      const facts = await this.getFacts();
      return facts.length;
    } catch (error) {
      return 0;
    }
  }
  
  private async getFacts(): Promise<ContextFactWithId[]> {
    return await storage.getJSON<ContextFactWithId[]>(ContextFactStore.STORAGE_KEY) || [];
  }
  
  private async computeHash(fact: ContextFact): Promise<string> {
    // Simple hash for deduplication
    const str = JSON.stringify(fact.data);
    return str.slice(0, 16);
  }
  
  private emitFactAdded(fact: ContextFactWithId): void {
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('context:fact:added', { 
          detail: { fact, timestamp: Date.now() }
        }));
      }
    } catch (error) {
      // Silent fail for SSR safety
    }
  }
}
