import { RealTimeLearningFeedback } from '@/core/intelligence/RealTimeLearningFeedback';
import { PredictiveVibeEngine } from '@/core/intelligence/PredictiveVibeEngine';
import { ActivityRecommendationEngine } from '@/core/intelligence/ActivityRecommendationEngine';
import { learnFromCorrection } from '@/core/vibe/learning/PersonalWeightStore';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';
import { ContextFactStore } from '@/core/context/ContextFactStore';
import { ContextSynthesizer } from '@/core/context/ContextSynthesizer';
import type { Vibe } from '@/lib/vibes';
import type { ComponentKey } from '@/core/vibe/types';
import type { PersonalityInsights } from '@/types/personality';
import type { ContextSummary } from '@/core/context/types';

/**
 * Central intelligence integration system that connects
 * real-time learning feedback to the existing correction flow
 */
class IntelligenceIntegration {
  private learningFeedback: RealTimeLearningFeedback | null = null;
  private predictiveEngine: PredictiveVibeEngine | null = null;
  private activityEngine: ActivityRecommendationEngine | null = null;
  private contextStore: ContextFactStore | null = null;
  private contextSynthesizer: ContextSynthesizer | null = null;

  /**
   * Initialize engines with personality insights
   */
  private ensureEnginesInitialized(): boolean {
    // We need to get fresh insights each time since they update
    const insights = this.getCurrentInsights();
    if (!insights || !insights.hasEnoughData) {
      return false;
    }

    // Initialize engines if they don't exist or need refresh
    if (!this.learningFeedback) {
      this.learningFeedback = new RealTimeLearningFeedback(insights);
    }
    if (!this.predictiveEngine) {
      this.predictiveEngine = new PredictiveVibeEngine(insights);
    }
    if (!this.activityEngine) {
      this.activityEngine = new ActivityRecommendationEngine(insights);
    }
    if (!this.contextStore) {
      this.contextStore = new ContextFactStore();
    }
    if (!this.contextSynthesizer) {
      this.contextSynthesizer = new ContextSynthesizer();
    }

    return true;
  }

  /**
   * Get current personality insights from storage
   */
  private getCurrentInsights(): PersonalityInsights | null {
    try {
      // Try to get insights from the pattern store cache
      const cached = localStorage.getItem('pattern-insights-cache-v1');
      if (cached) {
        const data = JSON.parse(cached);
        if (data.insights && data.timestamp > Date.now() - 5 * 60 * 1000) {
          return data.insights;
        }
      }
    } catch (error) {
      console.warn('[Intelligence] Failed to get cached insights:', error);
    }
    return null;
  }

  /**
   * Enhanced correction handler that integrates with real-time learning
   */
  async handleVibeCorrection(params: {
    predicted: Vibe;
    corrected: Vibe;
    componentScores: Record<ComponentKey, number>;
    confidence: number;
    context?: {
      location?: { lat: number; lng: number };
      time?: Date;
      weather?: any;
    };
  }) {
    const { predicted, corrected, componentScores, confidence } = params;

    try {
      // 1. Apply learning to personal weight store (existing flow)
      learnFromCorrection({
        predicted,
        target: corrected,
        componentScores,
        eta: 0.02
      });

      // 2. Record correction in real-time learning system if available
      if (this.ensureEnginesInitialized() && this.learningFeedback) {
        this.learningFeedback.recordCorrection(
          predicted,
          corrected,
          componentScores,
          confidence
        );
      }

      // 3. Record context fact for AI learning
      if (this.contextStore) {
        await this.contextStore.append({
          type: 'vibe_correction',
          data: {
            from: predicted,
            to: corrected,
            components: componentScores,
            confidence
          }
        });
      }

      console.log('[Intelligence] Processed correction:', { predicted, corrected, confidence });

    } catch (error) {
      console.error('[Intelligence] Failed to process correction:', error);
      // Don't throw - this is enhancement, shouldn't break basic flow
    }
  }

  /**
   * Get current intelligence state for UI display
   */
  getIntelligenceState() {
    if (!this.ensureEnginesInitialized()) {
      return {
        learningStatus: { isActivelyLearning: false, recentCorrections: 0 },
        recentInsights: [],
        predictiveInsights: [],
        activityRecommendations: []
      };
    }

    return {
      learningStatus: this.learningFeedback?.getCurrentFeedback()?.currentLearningState || { isActivelyLearning: false, recentCorrections: 0 },
      recentInsights: this.learningFeedback?.getCurrentFeedback()?.recentEvents || [],
      predictiveInsights: [],
      activityRecommendations: []
    };
  }

  /**
   * Get contextual vibe suggestions for current situation
   */
  async getContextualSuggestions(context: {
    location?: { lat: number; lng: number };
    time?: Date;
    weather?: any;
    recentVibes?: Vibe[];
    currentReading?: any;
  }) {
    if (!this.ensureEnginesInitialized() || !this.predictiveEngine) {
      return null;
    }

    try {
      const hour = context.time?.getHours() || new Date().getHours();
      const dayOfWeek = context.time?.getDay() || new Date().getDay();
      
      const predictiveContext = {
        hour,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        weatherCondition: context.weather?.condition
      };

      const predictions = this.predictiveEngine.predictUpcomingVibes(predictiveContext);
      
      // Get context facts and synthesize patterns
      let contextualReasons: string[] = [];
      if (this.contextStore && this.contextSynthesizer) {
        const facts = await this.contextStore.getRecent(100);
        const contextSummary = this.contextSynthesizer.synthesize(facts, context.currentReading);
        contextualReasons = contextSummary.contextualInsights.map(insight => insight.text);
      }
      
      return {
        vibePredictions: predictions.map(p => ({
          vibe: p.vibe,
          confidence: p.confidence,
          reasoning: p.reasoning.join('. ')
        })),
        contextualReasons,
        activitySuggestions: [],
        confidence: predictions.length > 0 ? predictions[0].confidence : 0
      };
    } catch (error) {
      console.error('[Intelligence] Failed to generate contextual suggestions:', error);
      return null;
    }
  }

  /**
   * Get current context summary
   */
  async getContextSummary(): Promise<ContextSummary | null> {
    if (!this.ensureEnginesInitialized() || !this.contextStore || !this.contextSynthesizer) {
      return null;
    }

    try {
      const facts = await this.contextStore.getRecent(100);
      return this.contextSynthesizer.synthesize(facts);
    } catch (error) {
      console.error('[Intelligence] Failed to get context summary:', error);
      return null;
    }
  }

  /**
   * Record a context fact
   */
  async recordContextFact(fact: { type: any; data: any }): Promise<string | null> {
    if (!this.ensureEnginesInitialized() || !this.contextStore) {
      return null;
    }

    try {
      return await this.contextStore.append(fact);
    } catch (error) {
      console.error('[Intelligence] Failed to record context fact:', error);
      return null;
    }
  }

  /**
   * Check if this correction should trigger activity recommendation updates
   */
  private shouldUpdateActivityRecommendations(predicted: Vibe, corrected: Vibe): boolean {
    // Update if it's a significant vibe change that affects activity preferences
    const significantVibeChanges = [
      ['solo', 'social'], ['social', 'solo'],
      ['chill', 'hype'], ['hype', 'chill'],
      ['down', 'open'], ['open', 'down']
    ];

    return significantVibeChanges.some(([from, to]) => 
      (predicted === from && corrected === to) ||
      (predicted === to && corrected === from)
    );
  }

  /**
   * Reset all intelligence state (for testing/debugging)
   */
  reset() {
    this.learningFeedback = null;
    this.predictiveEngine = null;
    this.activityEngine = null;
    this.contextStore = null;
    this.contextSynthesizer = null;
  }
}

// Singleton instance
export const intelligenceIntegration = new IntelligenceIntegration();