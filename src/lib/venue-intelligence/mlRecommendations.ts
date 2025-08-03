import { supabase } from '@/integrations/supabase/client';

export interface UserBehaviorPattern {
  venueId: string;
  category: string;
  visitFrequency: number;
  averageStayDuration: number;
  timeOfDay: number[];
  dayOfWeek: number[];
  interactionTypes: string[];
  rating: number;
  socialContext: 'solo' | 'friends' | 'family' | 'date' | 'work';
}

export interface MLRecommendationScore {
  venueId: string;
  score: number;
  confidence: number;
  factors: {
    behaviorMatch: number;
    temporalMatch: number;
    categoryPreference: number;
    socialContextMatch: number;
    noveltyFactor: number;
  };
  explanation: string;
}

export interface ContextualFactors {
  timeOfDay: number;
  dayOfWeek: number;
  weather: string;
  socialContext: 'solo' | 'friends' | 'family' | 'date' | 'work';
  mood: string[];
  recentActivity: string;
}

/**
 * Machine Learning-powered venue recommendation system
 * Uses user behavior patterns to predict venue preferences
 */
export class MLRecommendationEngine {
  private userId: string;
  private userPatterns: UserBehaviorPattern[] = [];
  private categoryWeights: Map<string, number> = new Map();
  private temporalPreferences: Map<string, number> = new Map();
  private socialContextPreferences: Map<string, number> = new Map();
  private cacheExpiry: number = 15 * 60 * 1000; // 15 minutes
  private lastCacheUpdate: number = 0;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Generate ML-powered recommendations for venues
   */
  async generateRecommendations(
    candidateVenues: any[],
    contextualFactors: ContextualFactors
  ): Promise<MLRecommendationScore[]> {
    await this.loadUserBehaviorPatterns();
    await this.trainPreferenceModels();

    const recommendations = candidateVenues.map(venue => 
      this.calculateMLScore(venue, contextualFactors)
    );

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Load and analyze user behavior patterns
   */
  private async loadUserBehaviorPatterns(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate < this.cacheExpiry && this.userPatterns.length > 0) {
      return;
    }

    try {
      // Get user's venue interaction history
      const { data: venueStays, error: staysError } = await supabase
        .from('venue_stays')
        .select(`
          venue_id,
          arrived_at,
          departed_at,
          venues!inner(
            name,
            categories,
            rating
          )
        `)
        .eq('profile_id', this.userId)
        .gte('arrived_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()) // Last 6 months
        .order('arrived_at', { ascending: false })
        .limit(200);

      if (staysError) throw staysError;

      // Get user interactions
      const { data: interactions, error: interactionsError } = await supabase
        .from('user_venue_interactions')
        .select(`
          venue_id,
          interaction_type,
          interaction_count,
          last_interaction_at
        `)
        .eq('profile_id', this.userId)
        .gte('last_interaction_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
        .limit(500);

      if (interactionsError) throw interactionsError;

      // Process behavior patterns
      this.userPatterns = this.extractBehaviorPatterns(venueStays || [], interactions || []);
      this.lastCacheUpdate = now;
    } catch (error) {
      console.error('Error loading user behavior patterns:', error);
    }
  }

  /**
   * Extract behavior patterns from raw data
   */
  private extractBehaviorPatterns(
    venueStays: any[],
    interactions: any[]
  ): UserBehaviorPattern[] {
    const venuePatternMap = new Map<string, Partial<UserBehaviorPattern>>();

    // Process venue stays
    venueStays.forEach(stay => {
      const venueId = stay.venue_id;
      const arrivedAt = new Date(stay.arrived_at);
      const departedAt = stay.departed_at ? new Date(stay.departed_at) : null;
      
      if (!venuePatternMap.has(venueId)) {
        venuePatternMap.set(venueId, {
          venueId,
          category: stay.venues?.categories?.[0] || 'unknown',
          visitFrequency: 0,
          averageStayDuration: 0,
          timeOfDay: [],
          dayOfWeek: [],
          interactionTypes: [],
          rating: stay.venues?.rating || 4.0,
          socialContext: this.inferSocialContext(arrivedAt)
        });
      }

      const pattern = venuePatternMap.get(venueId)!;
      pattern.visitFrequency = (pattern.visitFrequency || 0) + 1;
      pattern.timeOfDay!.push(arrivedAt.getHours());
      pattern.dayOfWeek!.push(arrivedAt.getDay());

      if (departedAt) {
        const duration = (departedAt.getTime() - arrivedAt.getTime()) / (1000 * 60); // minutes
        const currentAvg = pattern.averageStayDuration || 0;
        pattern.averageStayDuration = (currentAvg + duration) / 2;
      }
    });

    // Process interactions
    interactions.forEach(interaction => {
      const venueId = interaction.venue_id;
      if (venuePatternMap.has(venueId)) {
        const pattern = venuePatternMap.get(venueId)!;
        pattern.interactionTypes!.push(interaction.interaction_type);
      }
    });

    return Array.from(venuePatternMap.values()) as UserBehaviorPattern[];
  }

  /**
   * Infer social context from visit patterns
   */
  private inferSocialContext(visitTime: Date): 'solo' | 'friends' | 'family' | 'date' | 'work' {
    const hour = visitTime.getHours();
    const dayOfWeek = visitTime.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Simple heuristics - would be more sophisticated in production
    if (hour >= 9 && hour <= 17 && !isWeekend) return 'work';
    if (hour >= 19 && hour <= 23 && !isWeekend) return 'date';
    if (isWeekend && hour >= 10 && hour <= 16) return 'family';
    if (hour >= 17 && hour <= 23) return 'friends';
    return 'solo';
  }

  /**
   * Train preference models from behavior patterns
   */
  private async trainPreferenceModels(): Promise<void> {
    this.categoryWeights.clear();
    this.temporalPreferences.clear();
    this.socialContextPreferences.clear();

    // Train category preferences
    const categoryFrequency = new Map<string, number>();
    const categoryRatings = new Map<string, number[]>();

    this.userPatterns.forEach(pattern => {
      // Category frequency
      const currentFreq = categoryFrequency.get(pattern.category) || 0;
      categoryFrequency.set(pattern.category, currentFreq + pattern.visitFrequency);

      // Category ratings
      if (!categoryRatings.has(pattern.category)) {
        categoryRatings.set(pattern.category, []);
      }
      categoryRatings.get(pattern.category)!.push(pattern.rating);
    });

    // Calculate category weights (frequency * average rating)
    for (const [category, frequency] of categoryFrequency.entries()) {
      const ratings = categoryRatings.get(category) || [4.0];
      const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      const weight = (frequency / this.userPatterns.length) * (avgRating / 5.0);
      this.categoryWeights.set(category, weight);
    }

    // Train temporal preferences
    const hourFrequency = new Map<number, number>();
    const dayFrequency = new Map<number, number>();

    this.userPatterns.forEach(pattern => {
      pattern.timeOfDay.forEach(hour => {
        hourFrequency.set(hour, (hourFrequency.get(hour) || 0) + 1);
      });
      pattern.dayOfWeek.forEach(day => {
        dayFrequency.set(day, (dayFrequency.get(day) || 0) + 1);
      });
    });

    // Normalize temporal preferences
    const totalHours = Array.from(hourFrequency.values()).reduce((sum, freq) => sum + freq, 0);
    const totalDays = Array.from(dayFrequency.values()).reduce((sum, freq) => sum + freq, 0);

    for (const [hour, freq] of hourFrequency.entries()) {
      this.temporalPreferences.set(`hour_${hour}`, freq / totalHours);
    }

    for (const [day, freq] of dayFrequency.entries()) {
      this.temporalPreferences.set(`day_${day}`, freq / totalDays);
    }

    // Train social context preferences
    const socialContextFreq = new Map<string, number>();
    this.userPatterns.forEach(pattern => {
      const current = socialContextFreq.get(pattern.socialContext) || 0;
      socialContextFreq.set(pattern.socialContext, current + pattern.visitFrequency);
    });

    const totalSocial = Array.from(socialContextFreq.values()).reduce((sum, freq) => sum + freq, 0);
    for (const [context, freq] of socialContextFreq.entries()) {
      this.socialContextPreferences.set(context, freq / totalSocial);
    }
  }

  /**
   * Calculate ML-powered recommendation score
   */
  private calculateMLScore(venue: any, context: ContextualFactors): MLRecommendationScore {
    const factors = {
      behaviorMatch: this.calculateBehaviorMatch(venue),
      temporalMatch: this.calculateTemporalMatch(context),
      categoryPreference: this.calculateCategoryPreference(venue.categories || []),
      socialContextMatch: this.calculateSocialContextMatch(context.socialContext),
      noveltyFactor: this.calculateNoveltyFactor(venue)
    };

    // Weighted combination of factors
    const score = (
      factors.behaviorMatch * 0.3 +
      factors.temporalMatch * 0.2 +
      factors.categoryPreference * 0.25 +
      factors.socialContextMatch * 0.15 +
      factors.noveltyFactor * 0.1
    );

    const confidence = this.calculateConfidence(factors);
    const explanation = this.generateExplanation(factors, venue);

    return {
      venueId: venue.id,
      score: Math.min(1.0, Math.max(0.0, score)),
      confidence,
      factors,
      explanation
    };
  }

  /**
   * Calculate behavior match score
   */
  private calculateBehaviorMatch(venue: any): number {
    const similarPatterns = this.userPatterns.filter(pattern => 
      pattern.category === venue.categories?.[0] ||
      venue.categories?.some((cat: string) => pattern.category.toLowerCase().includes(cat.toLowerCase()))
    );

    if (similarPatterns.length === 0) return 0.3; // Base score for unknown venues

    const avgRating = similarPatterns.reduce((sum, p) => sum + p.rating, 0) / similarPatterns.length;
    const totalVisits = similarPatterns.reduce((sum, p) => sum + p.visitFrequency, 0);
    const avgStayDuration = similarPatterns.reduce((sum, p) => sum + p.averageStayDuration, 0) / similarPatterns.length;

    // Normalize scores
    const ratingScore = avgRating / 5.0;
    const visitScore = Math.min(1.0, totalVisits / 10); // Cap at 10 visits
    const durationScore = Math.min(1.0, avgStayDuration / 120); // Cap at 2 hours

    return (ratingScore * 0.5) + (visitScore * 0.3) + (durationScore * 0.2);
  }

  /**
   * Calculate temporal match score
   */
  private calculateTemporalMatch(context: ContextualFactors): number {
    const hourPref = this.temporalPreferences.get(`hour_${context.timeOfDay}`) || 0.1;
    const dayPref = this.temporalPreferences.get(`day_${context.dayOfWeek}`) || 0.1;
    
    return (hourPref + dayPref) / 2;
  }

  /**
   * Calculate category preference score
   */
  private calculateCategoryPreference(venueCategories: string[]): number {
    if (venueCategories.length === 0) return 0.3;

    let maxWeight = 0;
    for (const category of venueCategories) {
      for (const [prefCategory, weight] of this.categoryWeights.entries()) {
        if (category.toLowerCase().includes(prefCategory.toLowerCase()) ||
            prefCategory.toLowerCase().includes(category.toLowerCase())) {
          maxWeight = Math.max(maxWeight, weight);
        }
      }
    }

    return maxWeight || 0.3; // Base score if no match
  }

  /**
   * Calculate social context match score
   */
  private calculateSocialContextMatch(socialContext: string): number {
    return this.socialContextPreferences.get(socialContext) || 0.2;
  }

  /**
   * Calculate novelty factor (encourages exploration)
   */
  private calculateNoveltyFactor(venue: any): number {
    const hasVisited = this.userPatterns.some(p => p.venueId === venue.id);
    if (hasVisited) return 0.3; // Lower novelty for visited venues

    // Higher novelty for new categories
    const hasTriedCategory = venue.categories?.some((cat: string) =>
      this.userPatterns.some(p => 
        p.category.toLowerCase().includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(p.category.toLowerCase())
      )
    );

    return hasTriedCategory ? 0.7 : 0.9; // High novelty for completely new categories
  }

  /**
   * Calculate confidence in recommendation
   */
  private calculateConfidence(factors: any): number {
    const dataPoints = this.userPatterns.length;
    const dataConfidence = Math.min(1.0, dataPoints / 20); // More data = higher confidence

    const factorVariance = Object.values(factors).reduce((sum: number, value: any) => {
      return sum + Math.pow(value - 0.5, 2);
    }, 0) / Object.keys(factors).length;

    const consistencyScore = 1 - factorVariance; // Lower variance = higher confidence

    return (dataConfidence * 0.6) + (consistencyScore * 0.4);
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(factors: any, venue: any): string {
    const explanations = [];

    if (factors.behaviorMatch > 0.7) {
      explanations.push("Strong match with your past venue preferences");
    } else if (factors.behaviorMatch > 0.5) {
      explanations.push("Good alignment with your venue history");
    }

    if (factors.temporalMatch > 0.6) {
      explanations.push("Perfect timing based on your usual patterns");
    }

    if (factors.categoryPreference > 0.7) {
      explanations.push(`You frequently enjoy ${venue.categories?.[0] || 'similar'} venues`);
    }

    if (factors.noveltyFactor > 0.8) {
      explanations.push("Exciting new discovery opportunity");
    } else if (factors.noveltyFactor < 0.4) {
      explanations.push("Familiar favorite you've enjoyed before");
    }

    if (explanations.length === 0) {
      explanations.push("Recommended based on your overall preferences");
    }

    return explanations.join(". ");
  }

  /**
   * Get user's preferred visit times for a category
   */
  async getPreferredVisitTimes(category: string): Promise<{ hour: number; score: number }[]> {
    await this.loadUserBehaviorPatterns();

    const categoryPatterns = this.userPatterns.filter(p => 
      p.category.toLowerCase().includes(category.toLowerCase())
    );

    if (categoryPatterns.length === 0) return [];

    const hourFrequency = new Map<number, number>();
    categoryPatterns.forEach(pattern => {
      pattern.timeOfDay.forEach(hour => {
        hourFrequency.set(hour, (hourFrequency.get(hour) || 0) + 1);
      });
    });

    const total = Array.from(hourFrequency.values()).reduce((sum, freq) => sum + freq, 0);
    
    return Array.from(hourFrequency.entries())
      .map(([hour, freq]) => ({ hour, score: freq / total }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Predict user's mood alignment with venue
   */
  predictMoodAlignment(venue: any, userMood: string[]): number {
    // Simple mood-category mapping
    const moodCategoryMap: { [key: string]: string[] } = {
      'energetic': ['bar', 'club', 'gym', 'sports'],
      'relaxed': ['cafe', 'spa', 'park', 'library'],
      'social': ['restaurant', 'bar', 'entertainment'],
      'creative': ['museum', 'gallery', 'bookstore', 'cafe'],
      'adventurous': ['outdoor', 'activity', 'new'],
      'romantic': ['restaurant', 'wine', 'scenic']
    };

    let alignmentScore = 0;
    let matchCount = 0;

    userMood.forEach(mood => {
      const compatibleCategories = moodCategoryMap[mood.toLowerCase()] || [];
      const hasMatch = venue.categories?.some((cat: string) =>
        compatibleCategories.some(compatible => 
          cat.toLowerCase().includes(compatible) || compatible.includes(cat.toLowerCase())
        )
      );
      
      if (hasMatch) {
        alignmentScore += 1;
        matchCount++;
      }
    });

    return matchCount > 0 ? alignmentScore / userMood.length : 0.5;
  }
}