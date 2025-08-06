import { supabase } from '@/integrations/supabase/client';
import type {
  FriendDetectionConfig,
  FriendshipAnalysis,
  FriendSuggestion,
  FriendshipSignal,
  CoLocationEvent,
  SharedActivityEvent,
  VenueOverlapPattern,
  TimeSyncPattern
} from '@/types/friendDetection';

/**
 * Friend Detection Engine
 * 
 * Analyzes user behavior patterns to identify potential friendships.
 * Uses the existing friendships table structure (user_low/user_high).
 * 
 * Note: profileId refers to profiles.id which equals auth.users.id (1:1 FK).
 * The friendships table uses auth.users.id directly as user_low/user_high.
 */
export class FriendDetectionEngine {
  private config: FriendDetectionConfig;

  constructor(config?: Partial<FriendDetectionConfig>) {
    this.config = {
      weights: {
        co_location: 0.3,
        shared_activity: 0.25,
        venue_overlap: 0.2,
        time_sync: 0.15,
        interaction_frequency: 0.1
      },
      thresholds: {
        friend_suggestion: 0.3,
        close_friend: 0.7,
        best_friend: 0.9
      },
      time_decay_factor: 0.95,
      min_confidence: 0.2,
      ...config
    };
  }

  /**
   * Analyze friendship potential between two users
   * @param profileA First user's profile ID (equals auth.users.id)
   * @param profileB Second user's profile ID (equals auth.users.id)
   */
  async analyzeFriendshipPotential(profileA: string, profileB: string): Promise<FriendshipAnalysis> {
    // Ensure canonical ordering for consistent storage
    const userLow = profileA < profileB ? profileA : profileB;
    const userHigh = profileA < profileB ? profileB : profileA;

    // Analyze all signals in parallel for better performance
    const [
      coLocationSignal,
      sharedActivitySignal,
      venueOverlapSignal,
      timeSyncSignal,
      interactionFrequencySignal
    ] = await Promise.all([
      this.analyzeCoLocationSignal(profileA, profileB),
      this.analyzeSharedActivitySignal(profileA, profileB),
      this.analyzeVenueOverlapSignal(profileA, profileB),
      this.analyzeTimeSyncSignal(profileA, profileB),
      this.analyzeInteractionFrequencySignal(profileA, profileB)
    ]);

    const signals = [
      coLocationSignal,
      sharedActivitySignal,
      venueOverlapSignal,
      timeSyncSignal,
      interactionFrequencySignal
    ].filter(signal => signal !== null) as FriendshipSignal[];

    const overallScore = this.calculateCompositeScore(signals);
    const confidenceLevel = this.determineConfidenceLevel(signals, overallScore);
    const relationshipType = this.determineRelationshipType(overallScore, signals);

    return {
      user_low: userLow,
      user_high: userHigh,
      overall_score: overallScore,
      confidence_level: confidenceLevel,
      relationship_type: relationshipType,
      signals_data: {
        signals: signals.map(s => ({
          type: s.type,
          strength: s.strength,
          confidence: s.confidence,
          lastSeen: s.lastSeen.toISOString(),
          metadata: s.metadata
        })),
        weights_used: this.config.weights,
        analysis_timestamp: new Date().toISOString()
      },
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  private async analyzeCoLocationSignal(profileA: string, profileB: string): Promise<FriendshipSignal | null> {
    try {
      const { data, error } = await supabase.rpc('analyze_co_location_events', {
        profile_a_id: profileA,
        profile_b_id: profileB,
        days_back: 90,
        min_overlap_minutes: 15
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const result = data[0] as any;
      const eventsCount = result?.events_count || 0;
      const totalMinutes = result?.total_overlap_minutes || 0;
      const avgProximity = result?.avg_proximity_score || 0;

      if (eventsCount === 0) return null;

      // Calculate strength based on frequency, duration, and proximity
      const frequencyScore = Math.min(eventsCount / 10, 1); // Normalize to 10 events = 1.0
      const durationScore = Math.min(totalMinutes / (60 * 10), 1); // 10 hours = 1.0
      const proximityScore = avgProximity;
      
      const strength = (frequencyScore * 0.4 + durationScore * 0.4 + proximityScore * 0.2);
      
      // Recency boost
      const daysSinceLastEvent = result?.most_recent_event 
        ? Math.floor((Date.now() - new Date(result.most_recent_event).getTime()) / (1000 * 60 * 60 * 24))
        : 90;
      const recencyMultiplier = Math.pow(this.config.time_decay_factor, daysSinceLastEvent);

      return {
        type: 'co_location',
        strength: Math.min(strength * recencyMultiplier, 1),
        confidence: Math.min(eventsCount / 5, 1), // 5+ events = high confidence
        lastSeen: result?.most_recent_event ? new Date(result.most_recent_event) : new Date(),
        metadata: {
          events_count: eventsCount,
          total_minutes: totalMinutes,
          venues_count: result?.venues_count || 0,
          avg_proximity: avgProximity
        }
      };
    } catch (error) {
      console.error('Error analyzing co-location signal:', error);
      return null;
    }
  }

  private async analyzeSharedActivitySignal(profileA: string, profileB: string): Promise<FriendshipSignal | null> {
    try {
      const [floqData, planData] = await Promise.all([
        supabase.rpc('analyze_shared_floq_participation', {
          profile_a_id: profileA,
          profile_b_id: profileB,
          days_back: 90
        }),
        supabase.rpc('analyze_shared_plan_participation', {
          profile_a_id: profileA,
          profile_b_id: profileB,
          days_back: 90
        })
      ]);

      if (floqData.error) throw floqData.error;
      if (planData.error) throw planData.error;

      const floqResult = floqData.data?.[0] || { shared_floqs_count: 0, total_overlap_score: 0, most_recent_shared: null };
      const planResult = planData.data?.[0] || { shared_plans_count: 0, total_overlap_score: 0, most_recent_shared: null };

      const totalActivities = (floqResult as any).shared_floqs_count + (planResult as any).shared_plans_count;
      const totalScore = (floqResult as any).total_overlap_score + (planResult as any).total_overlap_score;

      if (totalActivities === 0) return null;

      // Calculate strength based on frequency and diversity
      const frequencyScore = Math.min(totalActivities / 5, 1); // 5 shared activities = 1.0
      const diversityScore = ((floqResult as any).shared_floqs_count > 0 && (planResult as any).shared_plans_count > 0) ? 1.2 : 1.0;
      const qualityScore = totalScore / totalActivities; // Average interaction quality

      const strength = Math.min(frequencyScore * diversityScore * qualityScore, 1);

      // Recency calculation
      const mostRecentActivity = [(floqResult as any).most_recent_shared, (planResult as any).most_recent_shared]
        .filter(Boolean)
        .map(d => new Date(d!))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const daysSinceLastActivity = mostRecentActivity
        ? Math.floor((Date.now() - mostRecentActivity.getTime()) / (1000 * 60 * 60 * 24))
        : 90;
      const recencyMultiplier = Math.pow(this.config.time_decay_factor, daysSinceLastActivity);

      return {
        type: 'shared_activity',
        strength: Math.min(strength * recencyMultiplier, 1),
        confidence: Math.min(totalActivities / 3, 1), // 3+ activities = high confidence
        lastSeen: mostRecentActivity || new Date(),
        metadata: {
          shared_floqs: (floqResult as any).shared_floqs_count,
          shared_plans: (planResult as any).shared_plans_count,
          total_activities: totalActivities,
          avg_quality: qualityScore
        }
      };
    } catch (error) {
      console.error('Error analyzing shared activity signal:', error);
      return null;
    }
  }

  private async analyzeVenueOverlapSignal(profileA: string, profileB: string): Promise<FriendshipSignal | null> {
    try {
      const { data, error } = await supabase.rpc('analyze_venue_overlap_patterns', {
        profile_a_id: profileA,
        profile_b_id: profileB,
        days_back: 90
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const result = data[0] as any;
      const sharedVenues = result?.shared_venues_count || 0;
      const jaccardSimilarity = result?.jaccard_similarity || 0;
      const weightedOverlap = result?.weighted_overlap_score || 0;

      if (sharedVenues === 0) return null;

      // Combine Jaccard similarity and weighted overlap for strength
      const strength = (jaccardSimilarity * 0.6 + weightedOverlap * 0.4);

      return {
        type: 'venue_overlap',
        strength: Math.min(strength, 1),
        confidence: Math.min(sharedVenues / 5, 1), // 5+ shared venues = high confidence
        lastSeen: new Date(), // Venue overlap doesn't have a specific timestamp
        metadata: {
          shared_venues: sharedVenues,
          profile_a_visits: result.profile_a_visits,
          profile_b_visits: result.profile_b_visits,
          jaccard_similarity: jaccardSimilarity,
          weighted_overlap: weightedOverlap
        }
      };
    } catch (error) {
      console.error('Error analyzing venue overlap signal:', error);
      return null;
    }
  }

  private async analyzeTimeSyncSignal(profileA: string, profileB: string): Promise<FriendshipSignal | null> {
    try {
      const { data, error } = await supabase.rpc('analyze_time_sync_patterns', {
        profile_a_id: profileA,
        profile_b_id: profileB,
        days_back: 30
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const result = data[0];
      const syncScore = result.sync_score || 0;
      const syncConsistency = result.sync_consistency || 0;

      if (syncScore === 0) return null;

      // Combine sync score and consistency
      const strength = (syncScore * 0.7 + syncConsistency * 0.3);

      return {
        type: 'time_sync',
        strength: Math.min(strength, 1),
        confidence: syncConsistency, // Consistency indicates confidence
        lastSeen: new Date(),
        metadata: {
          sync_score: syncScore,
          sync_consistency: syncConsistency,
          peak_sync_hours: result.peak_sync_hours || []
        }
      };
    } catch (error) {
      console.error('Error analyzing time sync signal:', error);
      return null;
    }
  }

  private async analyzeInteractionFrequencySignal(profileA: string, profileB: string): Promise<FriendshipSignal | null> {
    try {
      // Query for mutual floq participation frequency
      const { data: mutualFloqs, error: floqError } = await supabase
        .from('floq_participants')
        .select('floq_id, floqs!inner(created_at)')
        .eq('profile_id', profileA)
        .in('floq_id', 
          await supabase
            .from('floq_participants')
            .select('floq_id')
            .eq('profile_id', profileB)
            .then(res => res.data?.map(r => r.floq_id) || [])
        );

      if (floqError) throw floqError;

      const mutualCount = mutualFloqs?.length || 0;
      if (mutualCount === 0) return null;

      // Calculate interaction frequency strength
      const strength = Math.min(mutualCount / 10, 1); // 10 mutual interactions = 1.0

      return {
        type: 'interaction_frequency',
        strength,
        confidence: Math.min(mutualCount / 5, 1), // 5+ interactions = high confidence
        lastSeen: new Date(),
        metadata: {
          mutual_interactions: mutualCount
        }
      };
    } catch (error) {
      console.error('Error analyzing interaction frequency signal:', error);
      return null;
    }
  }

  private calculateCompositeScore(signals: FriendshipSignal[]): number {
    if (signals.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      const weight = this.config.weights[signal.type] || 0;
      weightedSum += signal.strength * signal.confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.min(weightedSum / totalWeight, 1) : 0;
  }

  private determineConfidenceLevel(signals: FriendshipSignal[], overallScore: number): 'low' | 'medium' | 'high' {
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
    const signalDiversity = signals.length;

    if (avgConfidence >= 0.8 && signalDiversity >= 3) return 'high';
    if (avgConfidence >= 0.5 && signalDiversity >= 2) return 'medium';
    return 'low';
  }

  private determineRelationshipType(overallScore: number, signals: FriendshipSignal[]): 'acquaintance' | 'friend' | 'close_friend' | 'best_friend' {
    if (overallScore >= this.config.thresholds.best_friend) return 'best_friend';
    if (overallScore >= this.config.thresholds.close_friend) return 'close_friend';
    if (overallScore >= this.config.thresholds.friend_suggestion) return 'friend';
    return 'acquaintance';
  }

  /**
   * Find friend suggestions for a user
   * @param profileId The user's profile ID (equals auth.users.id)
   * @param limit Maximum number of suggestions to return
   */
  async findFriendSuggestions(profileId: string, limit: number = 10): Promise<FriendSuggestion[]> {
    try {
      // Get candidates from the database
      const { data: candidates, error } = await supabase.rpc('get_friend_suggestion_candidates', {
        target_profile_id: profileId,
        limit_count: limit * 2, // Get more candidates to filter through
        min_interactions: 2
      });

      if (error) throw error;
      if (!candidates || candidates.length === 0) return [];

      // Analyze each candidate
      const suggestions: FriendSuggestion[] = [];
      
      for (const candidate of candidates) {
        try {
          const analysis = await this.analyzeFriendshipPotential(profileId, candidate.profile_id);
          
          if (analysis.overall_score >= this.config.thresholds.friend_suggestion && 
              analysis.confidence_level !== 'low') {
            
            suggestions.push({
              target_profile_id: profileId,
              suggested_profile_id: candidate.profile_id,
              score: analysis.overall_score,
              confidence_level: analysis.confidence_level,
              suggestion_reason: this.generateSuggestionReason(analysis),
              signals_summary: analysis.signals_data,
              status: 'pending',
              created_at: new Date(),
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            });
          }
        } catch (analysisError) {
          console.error(`Error analyzing candidate ${candidate.profile_id}:`, analysisError);
          continue;
        }
      }

      // Sort by score and return top suggestions
      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      console.error('Error finding friend suggestions:', error);
      return [];
    }
  }

  private generateSuggestionReason(analysis: FriendshipAnalysis): string {
    const signals = analysis.signals_data.signals || [];
    const topSignal = signals.sort((a, b) => b.strength - a.strength)[0];
    
    if (!topSignal) return 'Based on your activity patterns';

    switch (topSignal.type) {
      case 'co_location':
        return `You've been at the same places ${topSignal.metadata?.events_count || 'multiple'} times`;
      case 'shared_activity':
        return `You've participated in ${topSignal.metadata?.total_activities || 'several'} activities together`;
      case 'venue_overlap':
        return `You visit ${topSignal.metadata?.shared_venues || 'several'} of the same places`;
      case 'time_sync':
        return 'You have similar activity patterns';
      case 'interaction_frequency':
        return 'You frequently interact in group activities';
      default:
        return 'Based on your shared interests and activities';
    }
  }
}