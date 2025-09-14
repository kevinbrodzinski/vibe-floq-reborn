import type { Vibe } from '@/lib/vibes';
import type { PersonalityInsights } from '@/types/personality';
import type { ComponentScores } from '@/core/vibe/types';

export type LearningEvent = {
  id: string;
  timestamp: number;
  type: 'correction' | 'pattern_detected' | 'confidence_boost' | 'insight_generated';
  description: string;
  impact: string;
  confidence: number;
  metadata?: Record<string, any>;
};

export type LearningFeedback = {
  recentEvents: LearningEvent[];
  currentLearningState: {
    isActivelyLearning: boolean;
    recentCorrections: number;
    patternStrength: number;
    nextMilestone: string;
  };
  insights: {
    strongestPatterns: string[];
    recentDiscoveries: string[];
    confidenceGrowth: number; // percentage change
  };
};

export class RealTimeLearningFeedback {
  private events: LearningEvent[] = [];
  private maxEvents = 50;

  constructor(private insights: PersonalityInsights | null) {}

  /**
   * Record a learning event
   */
  recordEvent(
    type: LearningEvent['type'],
    description: string,
    impact: string,
    confidence: number,
    metadata?: Record<string, any>
  ): void {
    const event: LearningEvent = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      description,
      impact,
      confidence,
      metadata
    };

    this.events.unshift(event); // Add to beginning
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Trigger UI update if needed
    this.notifyObservers(event);
  }

  /**
   * Record a user correction and its learning impact
   */
  recordCorrection(
    predicted: Vibe,
    corrected: Vibe,
    components: ComponentScores,
    learningStrength: number
  ): void {
    const description = `Learned from ${predicted} → ${corrected} correction`;
    const impact = this.describeCorrectionImpact(predicted, corrected, components, learningStrength);
    
    this.recordEvent('correction', description, impact, learningStrength, {
      predicted,
      corrected,
      components,
      learningStrength
    });

    // Check if this correction triggers pattern detection
    this.checkForPatternDetection(predicted, corrected, components);
  }

  /**
   * Record when a new pattern is detected
   */
  recordPatternDetection(patternType: string, description: string, confidence: number): void {
    const impact = `New ${patternType} pattern detected - predictions will be more accurate`;
    
    this.recordEvent('pattern_detected', description, impact, confidence, {
      patternType
    });
  }

  /**
   * Record confidence improvements
   */
  recordConfidenceBoost(source: string, oldConfidence: number, newConfidence: number): void {
    const improvement = ((newConfidence - oldConfidence) / oldConfidence * 100).toFixed(1);
    const description = `${source} improved prediction confidence`;
    const impact = `${improvement}% confidence boost from pattern learning`;
    
    this.recordEvent('confidence_boost', description, impact, newConfidence, {
      source,
      oldConfidence,
      newConfidence,
      improvement: parseFloat(improvement)
    });
  }

  /**
   * Get current learning feedback for UI display
   */
  getCurrentFeedback(): LearningFeedback {
    const recentEvents = this.events.slice(0, 10); // Last 10 events
    const recentCorrections = this.countRecentCorrections();
    
    return {
      recentEvents,
      currentLearningState: {
        isActivelyLearning: recentCorrections > 0,
        recentCorrections,
        patternStrength: this.insights?.confidence || 0,
        nextMilestone: this.getNextMilestone()
      },
      insights: {
        strongestPatterns: this.getStrongestPatterns(),
        recentDiscoveries: this.getRecentDiscoveries(),
        confidenceGrowth: this.calculateConfidenceGrowth()
      }
    };
  }

  /**
   * Get learning events for a specific time period
   */
  getEventsInPeriod(startTime: number, endTime: number): LearningEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * Clear old events (for privacy/storage management)
   */
  cleanupOldEvents(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.events = this.events.filter(event => event.timestamp > cutoff);
  }

  private describeCorrectionImpact(
    predicted: Vibe,
    corrected: Vibe,
    components: ComponentScores,
    strength: number
  ): string {
    const strongestComponent = Object.entries(components)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];

    const impacts = [
      `Adjusted ${strongestComponent} patterns`,
      `${corrected} preferences strengthened`,
      `Future ${corrected} predictions improved`
    ];

    if (strength > 0.05) {
      impacts.push('Strong learning signal captured');
    }

    return impacts[Math.floor(Math.random() * impacts.length)];
  }

  private checkForPatternDetection(predicted: Vibe, corrected: Vibe, components: ComponentScores): void {
    // Simple pattern detection logic
    const recentCorrections = this.events
      .filter(e => e.type === 'correction' && e.timestamp > Date.now() - 24 * 60 * 60 * 1000)
      .slice(0, 5);

    // Check for temporal patterns
    const timeOfDay = new Date().getHours();
    const sameTimeCorrections = recentCorrections.filter(e => {
      const eventHour = new Date(e.timestamp).getHours();
      return Math.abs(eventHour - timeOfDay) < 2 && e.metadata?.corrected === corrected;
    });

    if (sameTimeCorrections.length >= 2) {
      this.recordPatternDetection(
        'temporal',
        `You tend to prefer ${corrected} around ${timeOfDay}:00`,
        0.7
      );
    }

    // Check for venue context patterns (if available)
    const strongestComponent = Object.entries(components)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];

    if (strongestComponent === 'venueEnergy' && components.venueEnergy > 0.6) {
      const venueCorrections = recentCorrections.filter(e => 
        e.metadata?.components?.venueEnergy > 0.6 && e.metadata?.corrected === corrected
      );

      if (venueCorrections.length >= 2) {
        this.recordPatternDetection(
          'venue',
          `Strong ${corrected} preference in certain venues`,
          0.8
        );
      }
    }
  }

  private countRecentCorrections(): number {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return this.events.filter(e => 
      e.type === 'correction' && e.timestamp > oneDayAgo
    ).length;
  }

  private getNextMilestone(): string {
    if (!this.insights) return 'Make your first correction to start learning';
    
    const corrections = this.insights.correctionCount;
    
    if (corrections < 5) return `${5 - corrections} more corrections for basic patterns`;
    if (corrections < 10) return `${10 - corrections} more for advanced pattern detection`;
    if (corrections < 20) return `${20 - corrections} more for high-confidence predictions`;
    
    return 'Pattern learning at maximum effectiveness';
  }

  private getStrongestPatterns(): string[] {
    if (!this.insights) return [];

    const patterns: string[] = [];
    
    if (this.insights.chronotype !== 'balanced') {
      patterns.push(`${this.insights.chronotype} chronotype`);
    }
    
    if (this.insights.energyType !== 'balanced') {
      patterns.push(`${this.insights.energyType} energy`);
    }
    
    if (this.insights.socialType !== 'balanced') {
      patterns.push(`${this.insights.socialType} preference`);
    }

    if (this.insights.venueImpacts && this.insights.venueImpacts.length > 0) {
      const topVenue = this.insights.venueImpacts[0];
      patterns.push(`${topVenue.venueType} venue preference`);
    }

    return patterns.slice(0, 3);
  }

  private getRecentDiscoveries(): string[] {
    const discoveries: string[] = [];
    const recentPatternEvents = this.events
      .filter(e => e.type === 'pattern_detected' && e.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000)
      .slice(0, 3);

    for (const event of recentPatternEvents) {
      discoveries.push(event.description);
    }

    return discoveries;
  }

  private calculateConfidenceGrowth(): number {
    if (!this.insights || this.events.length < 2) return 0;

    const recentBoosts = this.events
      .filter(e => e.type === 'confidence_boost' && e.metadata?.improvement)
      .slice(0, 5);

    if (recentBoosts.length === 0) return 0;

    const totalGrowth = recentBoosts.reduce((sum, event) => 
      sum + (event.metadata?.improvement || 0), 0
    );

    return Math.round(totalGrowth / recentBoosts.length);
  }

  private notifyObservers(event: LearningEvent): void {
    // Dispatch custom event for real-time UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vibe-learning-event', {
        detail: event
      }));
    }
  }
}

// Global instance for easy access
export const learningFeedback = new RealTimeLearningFeedback(null);

// Update insights when available
export const updateLearningFeedbackInsights = (insights: PersonalityInsights | null) => {
  (learningFeedback as any).insights = insights;
};
