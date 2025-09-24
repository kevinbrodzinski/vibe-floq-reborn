import { storage } from '@/lib/storage';
import type { PersonalityInsights } from '@/types/personality';
import { VenuePatternAnalyzer } from '../analysis/VenuePatternAnalyzer';
import { SequenceDetector } from '../analysis/SequenceDetector';

/**
 * Pattern Storage & Caching System
 * 
 * Optimizes pattern computation by:
 * - Caching computed PersonalityInsights
 * - Tracking pattern confidence over time  
 * - Invalidating on new corrections
 * - Persisting across app sessions
 */

export interface PatternSnapshot {
  insights: PersonalityInsights;
  timestamp: Date;
  correctionsHash: string;  // Hash of corrections when computed
  version: number;          // Schema version for migrations
}

export interface PatternTrend {
  timestamp: Date;
  correctionCount: number;
  confidenceScore: number;  // How confident we are in patterns
  accuracy: number;         // How accurate our predictions are
  chronotypeStability: number; // How stable chronotype detection is
}

export interface PatternRecommendation {
  id: string;
  type: 'temporal' | 'venue' | 'sequence' | 'energy';
  title: string;
  description: string;
  confidence: number;       // 0-1 confidence in recommendation
  actionable: boolean;      // Whether user can act on this
  context?: any;            // Additional context data
  lastSeen?: Date;          // When user last saw this recommendation
}

export interface PatternSuggestion {
  id: string;
  type: 'venue' | 'sequence' | 'temporal';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  context?: any;
}

class PatternStoreImpl {
  private readonly STORAGE_KEY = 'vibe-pattern-cache-v1';
  private readonly TRENDS_KEY = 'vibe-pattern-trends-v1'; 
  private readonly RECOMMENDATIONS_KEY = 'vibe-pattern-recommendations-v1';
  private readonly CURRENT_VERSION = 1;
  private readonly MAX_TRENDS = 100;
  private readonly MAX_RECOMMENDATIONS = 20;

  /**
   * Get cached pattern insights
   */
  async getCachedInsights(): Promise<PatternSnapshot | null> {
    try {
      const cached = await storage.getJSON<PatternSnapshot>(this.STORAGE_KEY);
      if (!cached || cached.version !== this.CURRENT_VERSION) {
        return null;
      }
      // Parse timestamp back to Date object
      cached.timestamp = new Date(cached.timestamp);
      return cached;
    } catch (error) {
      console.warn('[PatternStore] Failed to get cached insights:', error);
      return null;
    }
  }

  /**
   * Cache new pattern insights
   */
  async setCachedInsights(
    insights: PersonalityInsights, 
    correctionsHash: string
  ): Promise<void> {
    try {
      const snapshot: PatternSnapshot = {
        insights,
        timestamp: new Date(),
        correctionsHash,
        version: this.CURRENT_VERSION
      };
      await storage.setJSON(this.STORAGE_KEY, snapshot);
    } catch (error) {
      console.warn('[PatternStore] Failed to cache insights:', error);
    }
  }

  /**
   * Check if cached insights are still valid
   */
  async isCacheValid(correctionsHash: string): Promise<boolean> {
    const cached = await this.getCachedInsights();
    if (!cached) return false;
    
    // Check if corrections changed
    if (cached.correctionsHash !== correctionsHash) return false;
    
    // Check if cache is too old (24 hours)
    const cacheAge = Date.now() - cached.timestamp.getTime();
    if (cacheAge > 24 * 60 * 60 * 1000) return false;
    
    return true;
  }

  /**
   * Record pattern trend data
   */
  async recordTrend(
    correctionCount: number,
    confidenceScore: number,
    accuracy: number,
    chronotypeStability: number
  ): Promise<void> {
    try {
      const trends = await this.getTrends();
      
      const newTrend: PatternTrend = {
        timestamp: new Date(),
        correctionCount,
        confidenceScore,
        accuracy,
        chronotypeStability
      };
      
      trends.push(newTrend);
      
      // Keep only recent trends
      if (trends.length > this.MAX_TRENDS) {
        trends.splice(0, trends.length - this.MAX_TRENDS);
      }
      
      await storage.setJSON(this.TRENDS_KEY, trends);
    } catch (error) {
      console.warn('[PatternStore] Failed to record trend:', error);
    }
  }

  /**
   * Get pattern trends over time
   */
  async getTrends(): Promise<PatternTrend[]> {
    try {
      const trends = await storage.getJSON<PatternTrend[]>(this.TRENDS_KEY);
      if (!trends) return [];
      
      // Parse timestamps back to Date objects
      return trends.map(trend => ({
        ...trend,
        timestamp: new Date(trend.timestamp)
      }));
    } catch (error) {
      console.warn('[PatternStore] Failed to get trends:', error);
      return [];
    }
  }

  /**
   * Generate and store pattern recommendations
   */
  async updateRecommendations(insights: PersonalityInsights): Promise<void> {
    try {
      const recommendations: PatternRecommendation[] = [];
      
      // Only generate recommendations if we have enough data
      if (!insights.hasEnoughData) {
        await storage.setJSON(this.RECOMMENDATIONS_KEY, []);
        return;
      }

      // Chronotype recommendations
      if (insights.chronotype === 'lark') {
        recommendations.push({
          id: 'chronotype-morning',
          type: 'temporal',
          title: 'Morning Energy Peak',
          description: 'You tend to be most energetic between 6-11am',
          confidence: 0.8,
          actionable: true,
          context: { timeRange: 'morning', activity: 'important tasks' }
        });
      } else if (insights.chronotype === 'owl') {
        recommendations.push({
          id: 'chronotype-evening',
          type: 'temporal', 
          title: 'Evening Energy Peak',
          description: 'You tend to be most energetic between 5-10pm',
          confidence: 0.8,
          actionable: true,
          context: { timeRange: 'evening', activity: 'creative work' }
        });
      }

      // Energy type recommendations
      if (insights.energyType === 'high-energy') {
        recommendations.push({
          id: 'energy-venues',
          type: 'venue',
          title: 'High-Energy Venues',
          description: 'You prefer active, bustling environments',
          confidence: 0.7,
          actionable: true,
          context: { venueTypes: ['gym', 'busy cafe', 'social space'] }
        });
      } else if (insights.energyType === 'low-energy') {
        recommendations.push({
          id: 'calm-venues',
          type: 'venue',
          title: 'Calm Environments',
          description: 'You prefer quiet, peaceful settings',
          confidence: 0.7,
          actionable: true,
          context: { venueTypes: ['library', 'park', 'quiet cafe'] }
        });
      }

      // Social type recommendations
      if (insights.socialType === 'social') {
        recommendations.push({
          id: 'social-timing',
          type: 'sequence',
          title: 'Social Energy Patterns',
          description: 'You gain energy from social interactions',
          confidence: 0.75,
          actionable: true,
          context: { activity: 'social planning' }
        });
      } else if (insights.socialType === 'solo') {
        recommendations.push({
          id: 'solo-recharge',
          type: 'sequence',
          title: 'Solo Recharge Time',
          description: 'You recharge best in solitude',
          confidence: 0.75,
          actionable: true,
          context: { activity: 'alone time scheduling' }
        });
      }

      // Consistency recommendations
      if (insights.consistency === 'very-consistent') {
        recommendations.push({
          id: 'routine-optimization',
          type: 'energy',
          title: 'Routine Optimization',
          description: 'Your patterns are very predictable',
          confidence: 0.9,
          actionable: true,
          context: { approach: 'maintain routines' }
        });
      } else if (insights.consistency === 'highly-adaptive') {
        recommendations.push({
          id: 'variety-seeking',
          type: 'energy',
          title: 'Variety & Flexibility',
          description: 'You thrive on changing environments',
          confidence: 0.85,
          actionable: true,
          context: { approach: 'seek variety' }
        });
      }

      await storage.setJSON(this.RECOMMENDATIONS_KEY, recommendations);
    } catch (error) {
      console.warn('[PatternStore] Failed to update recommendations:', error);
    }
  }

  /**
   * Get current pattern recommendations
   */
  async getRecommendations(): Promise<PatternRecommendation[]> {
    try {
      const recommendations = await storage.getJSON<PatternRecommendation[]>(this.RECOMMENDATIONS_KEY);
      return recommendations || [];
    } catch (error) {
      console.warn('[PatternStore] Failed to get recommendations:', error);
      return [];
    }
  }

  /**
   * Mark recommendation as seen by user
   */
  async markRecommendationSeen(recommendationId: string): Promise<void> {
    try {
      const recommendations = await this.getRecommendations();
      const recommendation = recommendations.find(r => r.id === recommendationId);
      if (recommendation) {
        recommendation.lastSeen = new Date();
        await storage.setJSON(this.RECOMMENDATIONS_KEY, recommendations);
      }
    } catch (error) {
      console.warn('[PatternStore] Failed to mark recommendation seen:', error);
    }
  }

  /**
   * Clear all cached pattern data
   */
  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        storage.removeItem(this.STORAGE_KEY),
        storage.removeItem(this.TRENDS_KEY),
        storage.removeItem(this.RECOMMENDATIONS_KEY)
      ]);
    } catch (error) {
      console.warn('[PatternStore] Failed to clear cache:', error);
    }
  }
}

export const PatternStore = new PatternStoreImpl();
