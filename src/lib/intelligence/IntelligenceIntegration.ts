import { RealTimeLearningFeedback } from '@/core/intelligence/RealTimeLearningFeedback';
import { PredictiveVibeEngine } from '@/core/intelligence/PredictiveVibeEngine';
import { ActivityRecommendationEngine } from '@/core/intelligence/ActivityRecommendationEngine';
import { learnFromCorrection } from '@/core/vibe/learning/PersonalWeightStore';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';
import { ContextTruthLedger } from '@/core/context/ContextTruthLedger';
import { synthesizeContextSummary } from '@/core/context/ContextSynthesizer';
import type { Vibe } from '@/lib/vibes';
import type { ComponentKey } from '@/core/vibe/types';
import type { PersonalityInsights } from '@/types/personality';
import type { ContextSummary, VibeFact } from '@/core/context/types';

/**
 * Central intelligence integration system that connects
 * real-time learning feedback to the existing correction flow
 */
class IntelligenceIntegration {
  private learningFeedback: RealTimeLearningFeedback | null = null;
  private predictiveEngine: PredictiveVibeEngine | null = null;
  private activityEngine: ActivityRecommendationEngine | null = null;
  private contextLedger: ContextTruthLedger | null = null;

  /**
   * Initialize engines with personality insights
   */
  private ensureEnginesInitialized(): boolean {
    const insights = this.getCurrentInsights();
    if (!insights || !insights.hasEnoughData) {
      return false;
    }

    if (!this.learningFeedback) {
      this.learningFeedback = new RealTimeLearningFeedback(insights);
    }
    if (!this.predictiveEngine) {
      this.predictiveEngine = new PredictiveVibeEngine(insights);
    }
    if (!this.activityEngine) {
      this.activityEngine = new ActivityRecommendationEngine(insights);
    }
    if (!this.contextLedger) {
      this.contextLedger = new ContextTruthLedger();
    }

    return true;
  }

  private getCurrentInsights(): PersonalityInsights | null {
    try {
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

  async handleVibeCorrection(params: {
    predicted: Vibe;
    corrected: Vibe;
    componentScores: Record<ComponentKey, number>;
    confidence: number;
  }) {
    const { predicted, corrected, componentScores, confidence } = params;

    try {
      learnFromCorrection({
        predicted,
        target: corrected,
        componentScores,
        eta: 0.02
      });

      if (this.ensureEnginesInitialized() && this.learningFeedback) {
        this.learningFeedback.recordCorrection(
          predicted,
          corrected,
          componentScores,
          confidence
        );
      }

      if (this.contextLedger) {
        const vibeFact: VibeFact = {
          kind: 'vibe',
          t: Date.now(),
          c: confidence,
          data: {
            vibe: corrected,
            confidence,
            components: componentScores
          }
        };
        await this.contextLedger.append(vibeFact);
      }

      console.log('[Intelligence] Processed correction:', { predicted, corrected, confidence });

    } catch (error) {
      console.error('[Intelligence] Failed to process correction:', error);
    }
  }

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

  async getContextSummary(): Promise<ContextSummary | null> {
    if (!this.ensureEnginesInitialized() || !this.contextLedger) {
      return null;
    }

    try {
      const facts = this.contextLedger.getFacts({ limit: 100 });
      return synthesizeContextSummary(facts);
    } catch (error) {
      console.error('[Intelligence] Failed to get context summary:', error);
      return null;
    }
  }

  reset() {
    this.learningFeedback = null;
    this.predictiveEngine = null;
    this.activityEngine = null;
    this.contextLedger = null;
  }
}

// Singleton instance
export const intelligenceIntegration = new IntelligenceIntegration();