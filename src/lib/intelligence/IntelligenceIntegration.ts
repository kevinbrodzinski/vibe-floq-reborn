import { RealTimeLearningFeedback } from '@/core/intelligence/RealTimeLearningFeedback';
import { PredictiveVibeEngine } from '@/core/intelligence/PredictiveVibeEngine';
import { ActivityRecommendationEngine } from '@/core/intelligence/ActivityRecommendationEngine';
import { learnFromCorrection } from '@/core/vibe/learning/PersonalWeightStore';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';
import { ContextTruthLedger } from '@/core/context/ContextTruthLedger';
import { synthesizeContextSummary } from '@/core/context/ContextSynthesizer';
import { readVenueImpacts, writeVenueImpacts } from '@/core/patterns/service';
import { evolveVenueImpact } from '@/core/patterns/evolve';
import type { Vibe } from '@/lib/vibes';
import type { ComponentKey } from '@/core/vibe/types';
import type { PersonalityInsights } from '@/types/personality';
import type { ContextSummary, VibeFact, VenueFact } from '@/core/context/types';

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

      // --- VENUE EVOLUTION (bounded, silent on error) ---
      try {
        // Find venue type from context ledger or use general fallback
        const venueFacts = this.contextLedger?.getFactsByKind<VenueFact>('venue');
        const venueType = venueFacts?.slice(-1)[0]?.data?.type ?? 'general';

        if (venueType) {
          const v = await readVenueImpacts();
          v.data[venueType] = evolveVenueImpact(v.data[venueType], {
            energyDelta: Math.max(-1, Math.min(1, (componentScores.venueEnergy ?? 0) - 0.5)),
            preferredVibe: corrected,
            // dwellMin: pass if available from DwellTracker
          });
          await writeVenueImpacts(v);
          
          if (import.meta.env.DEV) {
            console.log(`[Patterns] Evolved venue ${venueType}:`, {
              energyDelta: ((componentScores.venueEnergy ?? 0) - 0.5).toFixed(3),
              preferredVibe: corrected,
              sampleCount: v.data[venueType]?.sampleN
            });
          }
        }
      } catch (venueError) {
        if (import.meta.env.DEV) {
          console.warn('[Patterns] Venue evolution failed:', venueError);
        }
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
      if (this.contextLedger) {
        const facts = this.contextLedger.getFacts({ limit: 100 });
        const contextSummary = synthesizeContextSummary(facts);
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

  async recordContextFact(fact: { kind: any; data: any; t?: number; c?: number }): Promise<string | null> {
    if (!this.ensureEnginesInitialized() || !this.contextLedger) {
      return null;
    }

    try {
      const factWithId = await this.contextLedger.append({
        ...fact,
        t: fact.t || Date.now(),
        c: fact.c || 0.5
      });
      return factWithId.id;
    } catch (error) {
      console.error('[Intelligence] Failed to record context fact:', error);
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