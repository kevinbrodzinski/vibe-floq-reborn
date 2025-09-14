import { storage } from '@/lib/storage';
import type { WorkingSet } from './types';
import type { VibeReading } from '@/core/vibe/types';
import type { PersonalityInsights } from '@/types/personality';

/**
 * Working Set Extractor - captures current session context
 * Integrates with existing vibe engine and intelligence system
 */
export class WorkingSetExtractor {
  private static readonly STORAGE_KEY = 'floq:context:working_set:v1';
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  private sessionStartTime: number = Date.now();
  
  /**
   * Extract current working set from vibe reading and insights
   */
  extract(vibeReading: VibeReading, insights: PersonalityInsights): WorkingSet {
    return {
      currentVibe: vibeReading.vibe,
      confidence: vibeReading.confidence01,
      components: vibeReading.components,
      patterns: insights.hasEnoughData ? insights : null,
      venueContext: vibeReading.venueIntelligence || null,
      timestamp: Date.now(),
      sessionDuration: Date.now() - this.sessionStartTime
    };
  }
  
  /**
   * Save working set for session persistence
   */
  async save(workingSet: WorkingSet): Promise<void> {
    try {
      await storage.setJSON(WorkingSetExtractor.STORAGE_KEY, {
        ...workingSet,
        savedAt: Date.now()
      });
    } catch (error) {
      console.warn('Failed to save working set:', error);
    }
  }
  
  /**
   * Restore working set from previous session
   */
  async restore(): Promise<WorkingSet | null> {
    try {
      const stored = await storage.getJSON<WorkingSet & { savedAt: number }>(
        WorkingSetExtractor.STORAGE_KEY
      );
      
      if (!stored) return null;
      
      // Only restore if recent (within session timeout)
      const age = Date.now() - stored.savedAt;
      if (age > WorkingSetExtractor.SESSION_TIMEOUT) {
        return null;
      }
      
      // Remove savedAt before returning
      const { savedAt, ...workingSet } = stored;
      return workingSet;
    } catch (error) {
      console.warn('Failed to restore working set:', error);
      return null;
    }
  }
  
  /**
   * Check if we have a valid session to resume
   */
  async hasValidSession(): Promise<boolean> {
    const workingSet = await this.restore();
    return workingSet !== null;
  }
  
  /**
   * Clear stored working set
   */
  async clear(): Promise<void> {
    try {
      await storage.removeItem(WorkingSetExtractor.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear working set:', error);
    }
  }
  
  /**
   * Start new session tracking
   */
  startNewSession(): void {
    this.sessionStartTime = Date.now();
  }
  
  /**
   * Get current session duration
   */
  getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }
}