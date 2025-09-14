import type { 
  ContextFactWithId, 
  ContextSummary, 
  VibeTransition, 
  VenuePattern, 
  CorrectionTrend,
  ContextualInsight 
} from './types';
import type { VibeReading } from '@/core/vibe/types';

/**
 * Context Synthesizer - analyzes facts to generate contextual insights
 * Builds patterns from your existing fact streams
 */
export class ContextSynthesizer {
  private static readonly RECENT_WINDOW = 60 * 60 * 1000; // 1 hour
  
  synthesize(facts: ContextFactWithId[], currentReading?: VibeReading): ContextSummary {
    const recentFacts = this.getRecentFacts(facts);
    
    const vibeTransitions = this.analyzeVibeFlow(recentFacts);
    const venueSequence = this.analyzeVenuePattern(recentFacts);
    const correctionTrends = this.analyzeLearningPattern(recentFacts);
    const contextualInsights = this.generateInsights(recentFacts, currentReading);
    
    return {
      vibeTransitions,
      venueSequence,
      correctionTrends,
      contextualInsights,
      factCount: facts.length,
      confidence: this.calculateOverallConfidence(vibeTransitions, venueSequence, correctionTrends),
      summary: this.generateSummary(vibeTransitions, venueSequence, correctionTrends)
    };
  }
  
  private analyzeVibeFlow(facts: ContextFactWithId[]): VibeTransition[] {
    const vibeFacts = facts.filter(f => f.type === 'vibe_correction');
    const transitions: VibeTransition[] = [];
    
    for (let i = 1; i < vibeFacts.length; i++) {
      const prev = vibeFacts[i - 1];
      const curr = vibeFacts[i];
      
      if (prev.type === 'vibe_correction' && curr.type === 'vibe_correction') {
        transitions.push({
          from: prev.data.from,
          to: curr.data.to,
          duration: curr.timestamp - prev.timestamp,
          confidence: (prev.data.confidence + curr.data.confidence) / 2,
          trigger: 'gradual_shift'
        });
      }
    }
    
    return transitions.slice(-5);
  }
  
  private analyzeVenuePattern(facts: ContextFactWithId[]): VenuePattern[] {
    const venueFacts = facts.filter(f => f.type === 'venue_transition');
    const venueMap = new Map<string, any[]>();
    
    venueFacts.forEach(fact => {
      if (fact.type === 'venue_transition' && fact.data.to) {
        const venueType = fact.data.to;
        if (!venueMap.has(venueType)) {
          venueMap.set(venueType, []);
        }
        venueMap.get(venueType)!.push(fact.data);
      }
    });
    
    return Array.from(venueMap.entries()).map(([venueType, visits]) => ({
      venueType,
      visitCount: visits.length,
      averageEnergy: 0.5,
      energyImpact: 0.5,
      optimalDuration: 30 * 60 * 1000
    }));
  }
  
  private analyzeLearningPattern(facts: ContextFactWithId[]): CorrectionTrend[] {
    const correctionFacts = facts.filter(f => f.type === 'vibe_correction');
    
    return [{
      pattern: 'Learning progress',
      frequency: correctionFacts.length / Math.max(facts.length, 1),
      accuracy: Math.max(0.1, 1 - (correctionFacts.length / 10)),
      improvement: 0.1
    }];
  }
  
  private generateInsights(facts: ContextFactWithId[], currentReading?: VibeReading): ContextualInsight[] {
    const insights: ContextualInsight[] = [];
    
    if (facts.length > 5) {
      insights.push({
        id: 'context-active',
        text: 'Building context awareness from your interactions',
        confidence: 0.8,
        category: 'behavioral',
        contextual: true
      });
    }
    
    return insights;
  }
  
  private getRecentFacts(facts: ContextFactWithId[]): ContextFactWithId[] {
    const cutoff = Date.now() - ContextSynthesizer.RECENT_WINDOW;
    return facts.filter(f => f.timestamp > cutoff);
  }
  
  private calculateOverallConfidence(
    transitions: VibeTransition[], 
    venues: VenuePattern[], 
    trends: CorrectionTrend[]
  ): number {
    return 0.7;
  }
  
  private generateSummary(
    transitions: VibeTransition[], 
    venues: VenuePattern[], 
    trends: CorrectionTrend[]
  ): string {
    return 'Building context awareness...';
  }
}