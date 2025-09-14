import type { Vibe } from '@/lib/vibes';
import type { PersonalityInsights } from '@/types/personality';
import type { VenueIntelligence } from '@/types/venues';

export type ActivityRecommendation = {
  id: string;
  type: 'venue' | 'activity' | 'vibe-shift';
  title: string;
  description: string;
  confidence: number;
  reasoning: string[];
  estimatedDuration: string;
  targetVibe: Vibe;
  actionable: {
    canBook?: boolean;
    canNavigate?: boolean;
    requiresPlanning?: boolean;
  };
  contextualTags: string[];
};

export type RecommendationContext = {
  currentVibe: Vibe;
  currentConfidence: number;
  timeOfDay: number;
  dayOfWeek: number;
  isWeekend: boolean;
  availableTime?: number; // minutes
  currentLocation?: { lat: number; lng: number };
  recentVenues?: string[];
};

export class ActivityRecommendationEngine {
  constructor(private insights: PersonalityInsights) {}

  /**
   * Generate personalized activity recommendations
   */
  generateRecommendations(context: RecommendationContext): ActivityRecommendation[] {
    if (!this.insights.hasEnoughData) {
      return this.getFallbackRecommendations(context);
    }

    const recommendations: ActivityRecommendation[] = [];

    // Add pattern-based venue recommendations
    recommendations.push(...this.getVenueRecommendations(context));
    
    // Add vibe transition recommendations
    recommendations.push(...this.getVibeShiftRecommendations(context));
    
    // Add activity recommendations based on patterns
    recommendations.push(...this.getActivityRecommendations(context));

    // Sort by confidence and relevance
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 recommendations
  }

  private getVenueRecommendations(context: RecommendationContext): ActivityRecommendation[] {
    const recommendations: ActivityRecommendation[] = [];
    const { venueImpacts } = this.insights;
    
    if (!venueImpacts || venueImpacts.length === 0) return recommendations;

    // Find venue types that align with current context
    const suitableVenues = venueImpacts.filter(impact => {
      // Skip recently visited venues
      if (context.recentVenues?.includes(impact.venueType)) return false;
      
      // Check time appropriateness
      if (this.isVenueAppropriateForTime(impact.venueType, context.timeOfDay)) {
        return impact.confidence > 0.4;
      }
      return false;
    });

    for (const venue of suitableVenues.slice(0, 3)) {
      const recommendation = this.createVenueRecommendation(venue, context);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  private getVibeShiftRecommendations(context: RecommendationContext): ActivityRecommendation[] {
    const recommendations: ActivityRecommendation[] = [];
    
    // Suggest optimal vibe transitions based on patterns
    const optimalVibes = this.getOptimalVibesForTime(context.timeOfDay);
    
    for (const targetVibe of optimalVibes) {
      if (targetVibe === context.currentVibe) continue;
      
      const activities = this.getVibeShiftActivities(context.currentVibe, targetVibe);
      for (const activity of activities.slice(0, 2)) {
        recommendations.push({
          id: `vibe-shift-${targetVibe}-${Date.now()}`,
          type: 'vibe-shift',
          title: activity.title,
          description: activity.description,
          confidence: this.calculateVibeShiftConfidence(context.currentVibe, targetVibe),
          reasoning: [
            `Transition from ${context.currentVibe} to ${targetVibe}`,
            ...activity.reasoning
          ],
          estimatedDuration: activity.duration,
          targetVibe,
          actionable: activity.actionable,
          contextualTags: ['vibe-transition', this.getTimeContextTag(context.timeOfDay)]
        });
      }
    }

    return recommendations;
  }

  private getActivityRecommendations(context: RecommendationContext): ActivityRecommendation[] {
    const recommendations: ActivityRecommendation[] = [];
    const { behaviorSequences } = this.insights;
    
    if (!behaviorSequences) return recommendations;

    // Find sequences with high confidence that could suggest activities
    const relevantSequences = behaviorSequences.filter(seq => 
      seq.confidence > 0.6 && seq.sampleSize >= 3
    );

    for (const sequence of relevantSequences.slice(0, 2)) {
      const activity = this.createSequenceBasedActivity(sequence, context);
      if (activity) {
        recommendations.push(activity);
      }
    }

    return recommendations;
  }

  private createVenueRecommendation(
    venueImpact: any, 
    context: RecommendationContext
  ): ActivityRecommendation | null {
    const venueActivities = this.getVenueActivities(venueImpact.venueType);
    if (venueActivities.length === 0) return null;

    const activity = venueActivities[0]; // Take the most relevant activity
    
    return {
      id: `venue-${venueImpact.venueType}-${Date.now()}`,
      type: 'venue',
      title: `Visit a ${venueImpact.venueType}`,
      description: activity.description,
      confidence: venueImpact.confidence * 0.9, // Slight discount for venue recommendations
      reasoning: [
        `${venueImpact.positiveOutcomes} positive experiences at ${venueImpact.venueType}s`,
        `Typically boosts your ${Object.keys(venueImpact.preferredVibes)[0]} energy`
      ],
      estimatedDuration: activity.duration,
      targetVibe: Object.keys(venueImpact.preferredVibes)[0] as Vibe,
      actionable: {
        canNavigate: true,
        requiresPlanning: venueImpact.venueType === 'restaurant'
      },
      contextualTags: [venueImpact.venueType, this.getTimeContextTag(context.timeOfDay)]
    };
  }

  private getVibeShiftActivities(currentVibe: Vibe, targetVibe: Vibe) {
    const transitions: Record<string, any[]> = {
      'down-to-energetic': [
        {
          title: 'Take a brisk walk',
          description: 'Get your blood flowing with 15 minutes of movement',
          duration: '15-20 min',
          reasoning: ['Physical activity boosts energy'],
          actionable: { canNavigate: false, requiresPlanning: false }
        }
      ],
      'chill-to-social': [
        {
          title: 'Text a friend',
          description: 'Reach out to someone for a quick chat or coffee',
          duration: '30-60 min',
          reasoning: ['Social connection builds momentum'],
          actionable: { canNavigate: false, requiresPlanning: true }
        }
      ],
      'hype-to-chill': [
        {
          title: 'Find a quiet space',
          description: 'Take some deep breaths and center yourself',
          duration: '10-15 min',
          reasoning: ['Mindful moments help regulate energy'],
          actionable: { canNavigate: false, requiresPlanning: false }
        }
      ]
    };

    const key = `${currentVibe}-to-${targetVibe}`;
    return transitions[key] || [
      {
        title: `Shift to ${targetVibe}`,
        description: 'Take a moment to align with your desired energy',
        duration: '5-10 min',
        reasoning: ['Small shifts can create big changes'],
        actionable: { canNavigate: false, requiresPlanning: false }
      }
    ];
  }

  private getOptimalVibesForTime(hour: number): Vibe[] {
    if (hour < 9) return ['energetic', 'focused', 'flowing'];
    if (hour < 12) return ['focused', 'curious', 'energetic'];
    if (hour < 17) return ['social', 'open', 'focused'];
    if (hour < 22) return ['social', 'flowing', 'chill'];
    return ['chill', 'romantic', 'solo'];
  }

  private getVenueActivities(venueType: string) {
    const activities: Record<string, any[]> = {
      coffee: [
        {
          description: 'Grab a coffee and settle in with a book or laptop',
          duration: '45-90 min'
        }
      ],
      gym: [
        {
          description: 'Get a workout in to boost your energy and mood',
          duration: '60-90 min'
        }
      ],
      park: [
        {
          description: 'Take a peaceful walk or find a bench to relax',
          duration: '30-60 min'
        }
      ],
      bar: [
        {
          description: 'Meet friends for drinks and good conversation',
          duration: '90-120 min'
        }
      ],
      restaurant: [
        {
          description: 'Enjoy a meal and connect with others',
          duration: '60-90 min'
        }
      ]
    };
    
    return activities[venueType] || [
      {
        description: `Explore this ${venueType} and see what draws you`,
        duration: '30-60 min'
      }
    ];
  }

  private isVenueAppropriateForTime(venueType: string, hour: number): boolean {
    const timeAppropriate: Record<string, number[]> = {
      coffee: [6, 7, 8, 9, 10, 11, 14, 15, 16],
      gym: [6, 7, 8, 9, 17, 18, 19, 20],
      office: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      restaurant: [11, 12, 13, 17, 18, 19, 20, 21],
      bar: [17, 18, 19, 20, 21, 22, 23],
      park: [6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19]
    };
    
    return timeAppropriate[venueType]?.includes(hour) ?? true;
  }

  private calculateVibeShiftConfidence(currentVibe: Vibe, targetVibe: Vibe): number {
    // Base confidence on pattern strength and vibe compatibility
    const baseConfidence = this.insights.confidence;
    
    // Some vibe transitions are more natural than others
    const transitionDifficulty = this.getTransitionDifficulty(currentVibe, targetVibe);
    
    return Math.max(0.3, baseConfidence * (1 - transitionDifficulty));
  }

  private getTransitionDifficulty(from: Vibe, to: Vibe): number {
    // Define transition difficulties (0 = easy, 1 = very difficult)
    const difficulties: Record<string, number> = {
      'down-energetic': 0.7,
      'hype-chill': 0.6,
      'solo-social': 0.5,
      'focused-flowing': 0.3,
      'chill-flowing': 0.2
    };
    
    return difficulties[`${from}-${to}`] || 0.4; // Default moderate difficulty
  }


  private createSequenceBasedActivity(sequence: any, context: RecommendationContext): ActivityRecommendation | null {
    const sequenceString = sequence.sequence.join(' → ');
    const nextVibes = Object.entries(sequence.nextVibeProbs)
      .filter(([_, prob]) => (prob as number) > 0.3)
      .sort(([,a], [,b]) => (b as number) - (a as number));
    
    if (nextVibes.length === 0) return null;
    
    const [targetVibe, probability] = nextVibes[0];
    
    return {
      id: `sequence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'activity',
      title: `Follow your ${sequenceString} pattern`,
      description: `You often move through this vibe sequence successfully`,
      confidence: sequence.confidence * 0.8,
      reasoning: [
        `${sequence.sampleSize} times you've followed similar patterns`,
        `${Math.round((probability as number) * 100)}% success rate for next step`
      ],
      estimatedDuration: `${Math.round(sequence.avgDuration)} min`,
      targetVibe: targetVibe as Vibe,
      actionable: { requiresPlanning: true },
      contextualTags: ['personal-pattern', 'sequence-based']
    };
  }

  private getTimeContextTag(hour: number): string {
    if (hour < 9) return 'morning';
    if (hour < 12) return 'late-morning';
    if (hour < 17) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  private getFallbackRecommendations(context: RecommendationContext): ActivityRecommendation[] {
    // Simple fallback recommendations when no patterns are available
    return [
      {
        id: 'fallback-1',
        type: 'activity',
        title: 'Take a mindful moment',
        description: 'Pause and check in with how you\'re feeling',
        confidence: 0.6,
        reasoning: ['Always a good time for self-awareness'],
        estimatedDuration: '5 min',
        targetVibe: 'chill',
        actionable: { requiresPlanning: false },
        contextualTags: ['mindfulness', 'self-care']
      }
    ];
  }
}