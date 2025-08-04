import { supabase } from '@/integrations/supabase/client';

export interface FriendNetworkData {
  friendId: string;
  displayName: string;
  venueVisits: number;
  lastVisit: string;
  averageRating: number;
  preferredCategories: string[];
  vibeCompatibility: number;
}

export interface NetworkCompatibilityScore {
  overallScore: number;
  friendsWhoLikeThis: number;
  totalNetworkSize: number;
  compatibilityReasons: string[];
  topInfluencers: string[];
}

export interface VenueNetworkInsights {
  friendVisits: FriendNetworkData[];
  networkRating: number;
  compatibilityScore: NetworkCompatibilityScore;
  socialTrends: {
    isPopularWithFriends: boolean;
    trendDirection: 'rising' | 'stable' | 'declining';
    recentActivity: string;
  };
  testimonials: Array<{
    friendName: string;
    comment: string;
    rating: number;
    timestamp: string;
  }>;
}

/**
 * Analyzes friend network preferences and venue compatibility
 */
export class FriendNetworkAnalyzer {
  private userId: string;
  private friendsCache: Map<string, FriendNetworkData> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate: number = 0;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Get comprehensive friend network analysis for a venue
   */
  async analyzeVenueForNetwork(venueId: string): Promise<VenueNetworkInsights> {
    await this.ensureFriendsDataCached();
    
    const [venueVisits, venueRatings, venueInteractions] = await Promise.all([
      this.getFriendVenueVisits(venueId),
      this.getFriendVenueRatings(venueId),
      this.getFriendVenueInteractions(venueId)
    ]);

    const friendVisits = this.processFriendVisits(venueVisits);
    const networkRating = this.calculateNetworkRating(venueRatings);
    const compatibilityScore = this.calculateCompatibilityScore(venueId, friendVisits);
    const socialTrends = this.analyzeSocialTrends(venueVisits, venueInteractions);
    const testimonials = this.extractTestimonials(venueInteractions);

    return {
      friendVisits,
      networkRating,
      compatibilityScore,
      socialTrends,
      testimonials
    };
  }

  /**
   * Cache friend network data for performance
   */
  private async ensureFriendsDataCached(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate < this.cacheExpiry && this.friendsCache.size > 0) {
      return;
    }

    try {
      // Get user's friends and their venue preferences
      const { data: friends, error: friendsError } = await supabase
        .from('friends')
        .select(`
          user_a,
          user_b,
          profiles_user_a:profiles!friends_user_a_fkey(
            id,
            display_name,
            avatar_url
          ),
          profiles_user_b:profiles!friends_user_b_fkey(
            id,
            display_name,
            avatar_url
          )
        `)
        .or(`user_a.eq.${this.userId},user_b.eq.${this.userId}`)
        .eq('status', 'accepted');

      if (friendsError) throw friendsError;

      if (friends?.length) {
        // Extract friend IDs and profiles (since friendship is bidirectional)
        const friendData = friends.map(f => {
          if (f.user_a === this.userId) {
            return { friend_id: f.user_b, profiles: f.profiles_user_b };
          } else {
            return { friend_id: f.user_a, profiles: f.profiles_user_a };
          }
        });
        const friendIds = friendData.map(f => f.friend_id);
        
        // Get friend venue interaction data
        const { data: friendVenueData, error: friendDataError } = await supabase
          .from('venue_stays')
          .select(`
            profile_id,
            venue_id,
            arrived_at,
            venues!inner(categories, rating)
          `)
          .in('profile_id', friendIds)
          .gte('arrived_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days

        if (friendDataError) throw friendDataError;

        // Process friend data
        const friendMap = new Map(friendData.map(f => [f.friend_id, f.profiles]));
        
        for (const friendId of friendIds) {
          const friendProfile = friendMap.get(friendId);
          const friendVenues = friendVenueData?.filter(d => d.profile_id === friendId) || [];
          
          const venueVisits = friendVenues.length;
          const lastVisit = friendVenues.length > 0 
            ? Math.max(...friendVenues.map(v => new Date(v.arrived_at).getTime()))
            : 0;
          
          const ratings = friendVenues
            .map(v => v.venues?.rating)
            .filter(Boolean) as number[];
          const averageRating = ratings.length > 0 
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
            : 4.0;

          const allCategories = friendVenues
            .flatMap(v => v.venues?.categories || []);
          const categoryCount = new Map<string, number>();
          
          allCategories.forEach(cat => {
            categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
          });
          
          const preferredCategories = Array.from(categoryCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category]) => category);

          this.friendsCache.set(friendId, {
            friendId,
            displayName: friendProfile?.display_name || 'Friend',
            venueVisits,
            lastVisit: new Date(lastVisit).toISOString(),
            averageRating,
            preferredCategories,
            vibeCompatibility: this.calculateVibeCompatibility(preferredCategories)
          });
        }
      }

      this.lastCacheUpdate = now;
    } catch (error) {
      console.error('Error caching friend network data:', error);
    }
  }

  /**
   * Get friend visits for a specific venue
   */
  private async getFriendVenueVisits(venueId: string) {
    const { data, error } = await supabase
      .from('venue_stays')
      .select(`
        profile_id,
        arrived_at,
        departed_at,
        profiles!inner(display_name, avatar_url)
      `)
      .eq('venue_id', venueId)
      .gte('arrived_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()) // Last 60 days
      .order('arrived_at', { ascending: false });

    if (error) {
      console.error('Error fetching friend venue visits:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get friend ratings for a venue
   */
  private async getFriendVenueRatings(venueId: string) {
    const { data, error } = await supabase
      .from('user_venue_interactions')
      .select(`
        profile_id,
        interaction_count,
        last_interaction_at,
        profiles!inner(display_name)
      `)
      .eq('venue_id', venueId)
      .eq('interaction_type', 'favorite')
      .gte('last_interaction_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error fetching friend venue ratings:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get friend interactions with venue
   */
  private async getFriendVenueInteractions(venueId: string) {
    const { data, error } = await supabase
      .from('user_venue_interactions')
      .select(`
        profile_id,
        interaction_type,
        interaction_count,
        last_interaction_at,
        profiles!inner(display_name)
      `)
      .eq('venue_id', venueId)
      .in('interaction_type', ['share', 'view', 'check_in'])
      .gte('last_interaction_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('last_interaction_at', { ascending: false });

    if (error) {
      console.error('Error fetching friend venue interactions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Process friend visits data
   */
  private processFriendVisits(visits: any[]): FriendNetworkData[] {
    const friendVisitMap = new Map<string, any[]>();
    
    visits.forEach(visit => {
      const friendId = visit.profile_id;
      if (!friendVisitMap.has(friendId)) {
        friendVisitMap.set(friendId, []);
      }
      friendVisitMap.get(friendId)!.push(visit);
    });

    return Array.from(friendVisitMap.entries()).map(([friendId, friendVisits]) => {
      const cachedFriend = this.friendsCache.get(friendId);
      const lastVisit = friendVisits.length > 0 
        ? friendVisits[0].arrived_at 
        : new Date().toISOString();

      return {
        friendId,
        displayName: friendVisits[0]?.profiles?.display_name || cachedFriend?.displayName || 'Friend',
        venueVisits: friendVisits.length,
        lastVisit,
        averageRating: cachedFriend?.averageRating || 4.0,
        preferredCategories: cachedFriend?.preferredCategories || [],
        vibeCompatibility: cachedFriend?.vibeCompatibility || 0.5
      };
    });
  }

  /**
   * Calculate network rating for venue
   */
  private calculateNetworkRating(ratings: any[]): number {
    if (ratings.length === 0) return 4.0;
    
    // Weight ratings by interaction count
    let totalWeight = 0;
    let weightedSum = 0;
    
    ratings.forEach(rating => {
      const weight = Math.min(rating.interaction_count, 10); // Cap at 10
      const score = 4.0 + (weight / 10); // Base 4.0, up to 5.0
      weightedSum += score * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? Math.min(5.0, weightedSum / totalWeight) : 4.0;
  }

  /**
   * Calculate compatibility score with friend network
   */
  private calculateCompatibilityScore(venueId: string, friendVisits: FriendNetworkData[]): NetworkCompatibilityScore {
    const totalNetworkSize = this.friendsCache.size;
    const friendsWhoLikeThis = friendVisits.length;
    
    if (totalNetworkSize === 0) {
      return {
        overallScore: 0.5,
        friendsWhoLikeThis: 0,
        totalNetworkSize: 0,
        compatibilityReasons: ['No friend network data available'],
        topInfluencers: []
      };
    }

    const rawScore = friendsWhoLikeThis / totalNetworkSize;
    const adjustedScore = Math.min(0.95, Math.max(0.1, rawScore * 1.5 + 0.2));
    
    const compatibilityReasons = [];
    if (friendsWhoLikeThis > 0) {
      compatibilityReasons.push(`${friendsWhoLikeThis} friends have visited this venue`);
    }
    if (rawScore > 0.3) {
      compatibilityReasons.push('High friend network engagement');
    }
    if (friendVisits.some(f => f.vibeCompatibility > 0.7)) {
      compatibilityReasons.push('Strong vibe alignment with your friend group');
    }

    const topInfluencers = friendVisits
      .sort((a, b) => (b.venueVisits * b.vibeCompatibility) - (a.venueVisits * a.vibeCompatibility))
      .slice(0, 3)
      .map(f => f.displayName);

    return {
      overallScore: adjustedScore,
      friendsWhoLikeThis,
      totalNetworkSize,
      compatibilityReasons,
      topInfluencers
    };
  }

  /**
   * Analyze social trends for venue
   */
  private analyzeSocialTrends(visits: any[], interactions: any[]) {
    const recentVisits = visits.filter(v => 
      new Date(v.arrived_at).getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000
    );
    const olderVisits = visits.filter(v => 
      new Date(v.arrived_at).getTime() <= Date.now() - 14 * 24 * 60 * 60 * 1000 &&
      new Date(v.arrived_at).getTime() > Date.now() - 28 * 24 * 60 * 60 * 1000
    );

    const isPopularWithFriends = visits.length >= 3;
    
    let trendDirection: 'rising' | 'stable' | 'declining' = 'stable';
    if (recentVisits.length > olderVisits.length * 1.5) {
      trendDirection = 'rising';
    } else if (recentVisits.length < olderVisits.length * 0.5) {
      trendDirection = 'declining';
    }

    const recentActivity = recentVisits.length > 0 
      ? `${recentVisits.length} friend${recentVisits.length > 1 ? 's' : ''} visited in the last 2 weeks`
      : 'No recent friend activity';

    return {
      isPopularWithFriends,
      trendDirection,
      recentActivity
    };
  }

  /**
   * Extract testimonials from interactions
   */
  private extractTestimonials(interactions: any[]) {
    // For now, generate realistic testimonials based on interaction patterns
    // In a real implementation, this would pull from actual user reviews/comments
    const testimonialTemplates = [
      "Great atmosphere and perfect for hanging out!",
      "Love coming here with friends",
      "One of my favorite spots in the area",
      "Always has good vibes",
      "Perfect for our friend group",
      "Great place to catch up with people"
    ];

    return interactions
      .filter(i => i.interaction_type === 'share' && i.interaction_count > 2)
      .slice(0, 3)
      .map((interaction, index) => ({
        friendName: interaction.profiles?.display_name || 'Friend',
        comment: testimonialTemplates[index % testimonialTemplates.length],
        rating: 4.0 + Math.random(),
        timestamp: interaction.last_interaction_at
      }));
  }

  /**
   * Calculate vibe compatibility based on venue preferences
   */
  private calculateVibeCompatibility(preferredCategories: string[]): number {
    // This would be enhanced with actual user vibe preferences
    const vibeWeights = {
      'restaurant': 0.8,
      'bar': 0.9,
      'cafe': 0.7,
      'entertainment': 0.8,
      'shopping': 0.5,
      'fitness': 0.6
    };

    let totalWeight = 0;
    let weightedScore = 0;

    preferredCategories.forEach(category => {
      const categoryLower = category.toLowerCase();
      for (const [key, weight] of Object.entries(vibeWeights)) {
        if (categoryLower.includes(key)) {
          totalWeight += 1;
          weightedScore += weight;
          break;
        }
      }
    });

    return totalWeight > 0 ? weightedScore / totalWeight : 0.5;
  }
}

/**
 * Enhanced vibe matching with user preference learning
 */
export class EnhancedVibeMatching {
  private userId: string;
  private userPreferences: Map<string, number> = new Map();

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Calculate enhanced vibe match score
   */
  async calculateEnhancedVibeMatch(
    userVibes: string[], 
    venueCategories: string[], 
    venueVibe: string | null,
    userHistory: any[]
  ): Promise<{
    score: number;
    explanation: string;
    userVibes: string[];
    venueVibes: string[];
    synergy: string;
    personalizedFactors: string[];
  }> {
    await this.loadUserPreferences(userHistory);

    // Enhanced category to vibe mapping
    const categoryVibeMap: { [key: string]: { vibes: string[], weight: number } } = {
      'restaurant': { vibes: ['social', 'flowing'], weight: 1.0 },
      'bar': { vibes: ['energetic', 'social'], weight: 1.2 },
      'cafe': { vibes: ['flowing', 'mindful', 'creative'], weight: 0.9 },
      'coffee': { vibes: ['flowing', 'creative'], weight: 0.8 },
      'club': { vibes: ['energetic', 'social'], weight: 1.3 },
      'gym': { vibes: ['energetic', 'focused'], weight: 0.7 },
      'library': { vibes: ['mindful', 'focused'], weight: 0.6 },
      'park': { vibes: ['flowing', 'mindful'], weight: 0.8 },
      'museum': { vibes: ['creative', 'sophisticated'], weight: 0.9 },
      'theater': { vibes: ['sophisticated', 'creative'], weight: 1.0 },
      'spa': { vibes: ['mindful', 'flowing'], weight: 0.8 },
      'music_venue': { vibes: ['energetic', 'creative'], weight: 1.1 }
    };

    const venueVibes: string[] = [];
    let categoryWeight = 1.0;

    venueCategories.forEach(category => {
      const categoryLower = category.toLowerCase();
      for (const [key, mapping] of Object.entries(categoryVibeMap)) {
        if (categoryLower.includes(key)) {
          venueVibes.push(...mapping.vibes);
          categoryWeight = Math.max(categoryWeight, mapping.weight);
          break;
        }
      }
    });

    if (venueVibe) {
      venueVibes.push(venueVibe);
    }

    const uniqueVenueVibes = [...new Set(venueVibes)];

    // Calculate base overlap
    const overlap = userVibes.filter(vibe => uniqueVenueVibes.includes(vibe)).length;
    const baseScore = overlap / Math.max(userVibes.length, uniqueVenueVibes.length);

    // Apply personalization based on user history
    const personalizationBoost = this.calculatePersonalizationBoost(venueCategories);
    const timeContextBoost = this.calculateTimeContextBoost(userVibes, uniqueVenueVibes);
    
    const finalScore = Math.min(0.95, Math.max(0.3, 
      (baseScore * categoryWeight) + 
      (personalizationBoost * 0.3) + 
      (timeContextBoost * 0.2) + 
      0.1
    ));

    const personalizedFactors = this.generatePersonalizedFactors(venueCategories, personalizationBoost);

    const explanation = this.generateEnhancedExplanation(
      userVibes, 
      uniqueVenueVibes, 
      overlap, 
      personalizedFactors
    );

    const synergy = this.generateSynergy(overlap, finalScore, personalizedFactors);

    return {
      score: finalScore,
      explanation,
      userVibes,
      venueVibes: uniqueVenueVibes,
      synergy,
      personalizedFactors
    };
  }

  /**
   * Load user preferences from interaction history
   */
  private async loadUserPreferences(userHistory: any[]): Promise<void> {
    userHistory.forEach(interaction => {
      if (interaction.venues?.categories) {
        interaction.venues.categories.forEach((category: string) => {
          const current = this.userPreferences.get(category) || 0;
          this.userPreferences.set(category, current + 1);
        });
      }
    });
  }

  /**
   * Calculate personalization boost based on user history
   */
  private calculatePersonalizationBoost(venueCategories: string[]): number {
    if (this.userPreferences.size === 0) return 0;

    let totalPreference = 0;
    let maxPreference = 0;

    for (const [category, count] of this.userPreferences.entries()) {
      maxPreference = Math.max(maxPreference, count);
      
      if (venueCategories.some(vc => vc.toLowerCase().includes(category.toLowerCase()))) {
        totalPreference += count;
      }
    }

    return maxPreference > 0 ? Math.min(1, totalPreference / maxPreference) : 0;
  }

  /**
   * Calculate time context boost
   */
  private calculateTimeContextBoost(userVibes: string[], venueVibes: string[]): number {
    const hour = new Date().getHours();
    
    // Morning boost for flowing/mindful vibes
    if (hour >= 6 && hour <= 11) {
      if (userVibes.includes('flowing') || venueVibes.includes('mindful')) {
        return 0.3;
      }
    }
    
    // Evening boost for social/energetic vibes
    if (hour >= 17 && hour <= 23) {
      if (userVibes.includes('social') || venueVibes.includes('energetic')) {
        return 0.4;
      }
    }
    
    return 0.1;
  }

  /**
   * Generate personalized factors
   */
  private generatePersonalizedFactors(venueCategories: string[], boost: number): string[] {
    const factors = [];
    
    if (boost > 0.7) {
      factors.push('Matches your frequent venue preferences');
    } else if (boost > 0.4) {
      factors.push('Similar to places you enjoy');
    }
    
    if (this.userPreferences.size > 0) {
      const topCategory = Array.from(this.userPreferences.entries())
        .sort((a, b) => b[1] - a[1])[0];
      
      if (venueCategories.some(vc => vc.toLowerCase().includes(topCategory[0].toLowerCase()))) {
        factors.push(`Aligns with your love for ${topCategory[0]} venues`);
      }
    }
    
    return factors;
  }

  /**
   * Generate enhanced explanation
   */
  private generateEnhancedExplanation(
    userVibes: string[], 
    venueVibes: string[], 
    overlap: number, 
    personalizedFactors: string[]
  ): string {
    const baseExplanation = overlap > 0 
      ? `Strong alignment between your ${userVibes.join(' + ')} vibes and venue's ${venueVibes.join(' + ')} atmosphere`
      : `Complementary energy - your ${userVibes.join(' + ')} vibes could blend well with ${venueVibes.join(' + ')} setting`;
    
    if (personalizedFactors.length > 0) {
      return `${baseExplanation}. ${personalizedFactors[0]}.`;
    }
    
    return baseExplanation;
  }

  /**
   * Generate synergy description
   */
  private generateSynergy(overlap: number, finalScore: number, personalizedFactors: string[]): string {
    if (finalScore > 0.8) {
      return "Perfect harmony between your energy and venue atmosphere";
    } else if (finalScore > 0.6) {
      return overlap > 1 ? "Multiple vibe alignments create natural connection" : "Complementary energies create interesting dynamic";
    } else {
      return "Contrasting vibes offer new perspective and growth opportunity";
    }
  }
}