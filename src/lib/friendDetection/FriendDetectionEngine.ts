import { supabase } from '@/integrations/supabase/client';
import type { 
  FriendshipSignal, 
  FriendshipScore, 
  FriendDetectionConfig,
  CoLocationEvent,
  SharedActivityEvent,
  VenueOverlapPattern,
  TimeSyncPattern
} from '@/types/friendDetection';

export class FriendDetectionEngine {
  private config: FriendDetectionConfig;

  constructor(config?: Partial<FriendDetectionConfig>) {
    this.config = {
      // Default configuration
      min_co_location_events: 3,
      min_shared_activities: 2,
      co_location_radius_m: 100,
      time_window_days: 90,
      
      weights: {
        co_location: 0.35,        // Strongest signal - being in same place
        shared_activity: 0.25,    // Strong signal - doing things together
        venue_overlap: 0.20,      // Medium signal - similar preferences
        time_sync: 0.15,          // Medium signal - similar schedules
        interaction_frequency: 0.05  // Weak signal - general activity
      },
      
      recency_decay_days: 30,
      min_confidence_for_suggestion: 0.6,
      
      // Override with provided config
      ...config
    };
  }

  /**
   * 🎯 Main function: Analyze friendship potential between two profiles
   */
  async analyzeFriendshipPotential(profileA: string, profileB: string): Promise<FriendshipScore> {
    console.log(`[FriendDetection] Analyzing friendship potential: ${profileA} ↔ ${profileB}`);

    // Ensure consistent ordering for profile_low/profile_high
    const profileLow = profileA < profileB ? profileA : profileB;
    const profileHigh = profileA < profileB ? profileB : profileA;

    // Collect all signals in parallel for performance
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

    // Calculate composite score
    const overallScore = this.calculateCompositeScore(signals);
    const confidenceLevel = this.determineConfidenceLevel(signals, overallScore);
    const relationshipType = this.determineRelationshipType(overallScore, signals);

    return {
      profile_low: profileLow,
      profile_high: profileHigh,
      overall_score: overallScore,
      confidence_level: confidenceLevel,
      signals,
      last_calculated: new Date().toISOString(),
      relationship_type: relationshipType
    };
  }

  /**
   * 🗺️ Analyze co-location patterns (strongest signal)
   */
  private async analyzeCoLocationSignal(profileA: string, profileB: string): Promise<FriendshipSignal | null> {
    const timeWindow = new Date();
    timeWindow.setDate(timeWindow.getDate() - this.config.time_window_days);

    // Query for co-location events using venue_live_presence
    const { data: coLocations, error } = await supabase.rpc('analyze_co_location_events', {
      profile_a_id: profileA,
      profile_b_id: profileB,
      time_window: timeWindow.toISOString(),
      radius_m: this.config.co_location_radius_m
    });

    if (error || !coLocations || coLocations.length === 0) {
      return null;
    }

    // Calculate signal strength based on frequency, duration, and recency
    const totalEvents = coLocations.length;
    const totalDurationMinutes = coLocations.reduce((sum: number, event: any) => 
      sum + (event.duration_minutes || 0), 0);
    
    const avgDurationMinutes = totalDurationMinutes / totalEvents;
    const recentEvents = coLocations.filter((event: any) => {
      const eventDate = new Date(event.start_time);
      const daysAgo = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= this.config.recency_decay_days;
    }).length;

    // Normalize scores
    const frequencyScore = Math.min(totalEvents / 10, 1); // Cap at 10 events
    const durationScore = Math.min(avgDurationMinutes / 120, 1); // Cap at 2 hours avg
    const recencyScore = recentEvents / totalEvents;

    const strength = (frequencyScore * 0.4 + durationScore * 0.3 + recencyScore * 0.3);
    const confidence = totalEvents >= this.config.min_co_location_events ? 0.9 : 0.6;

    return {
      signal_type: 'co_location',
      strength,
      frequency: totalEvents,
      recency: recencyScore,
      confidence,
      metadata: {
        total_events: totalEvents,
        avg_duration_minutes: avgDurationMinutes,
        recent_events: recentEvents,
        venues: [...new Set(coLocations.map((e: any) => e.venue_id))]
      }
    };
  }

  /**
   * 🎭 Analyze shared activity patterns (floqs, plans, events)
   */
  private async analyzeSharedActivitySignal(profileA: string, profileB: string): Promise<FriendshipSignal | null> {
    const timeWindow = new Date();
    timeWindow.setDate(timeWindow.getDate() - this.config.time_window_days);

    // Query shared floq participation
    const { data: sharedFloqs, error: floqError } = await supabase.rpc('analyze_shared_floq_participation', {
      profile_a_id: profileA,
      profile_b_id: profileB,
      time_window: timeWindow.toISOString()
    });

    // Query shared plan participation
    const { data: sharedPlans, error: planError } = await supabase.rpc('analyze_shared_plan_participation', {
      profile_a_id: profileA,
      profile_b_id: profileB,
      time_window: timeWindow.toISOString()
    });

    if ((floqError && planError) || (!sharedFloqs?.length && !sharedPlans?.length)) {
      return null;
    }

    const totalSharedActivities = (sharedFloqs?.length || 0) + (sharedPlans?.length || 0);
    const recentActivities = [...(sharedFloqs || []), ...(sharedPlans || [])].filter((activity: any) => {
      const activityDate = new Date(activity.joined_at || activity.created_at);
      const daysAgo = (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= this.config.recency_decay_days;
    }).length;

    const frequencyScore = Math.min(totalSharedActivities / 5, 1); // Cap at 5 activities
    const recencyScore = totalSharedActivities > 0 ? recentActivities / totalSharedActivities : 0;
    const diversityScore = Math.min(
      [...new Set([...(sharedFloqs || []), ...(sharedPlans || [])]
        .map((a: any) => a.activity_type))].length / 3, 1
    ); // Reward diversity

    const strength = (frequencyScore * 0.5 + recencyScore * 0.3 + diversityScore * 0.2);
    const confidence = totalSharedActivities >= this.config.min_shared_activities ? 0.8 : 0.5;

    return {
      signal_type: 'shared_activity',
      strength,
      frequency: totalSharedActivities,
      recency: recencyScore,
      confidence,
      metadata: {
        shared_floqs: sharedFloqs?.length || 0,
        shared_plans: sharedPlans?.length || 0,
        recent_activities: recentActivities,
        activity_types: [...new Set([...(sharedFloqs || []), ...(sharedPlans || [])]
          .map((a: any) => a.activity_type))]
      }
    };
  }

  /**
   * 🏢 Analyze venue overlap patterns (similar preferences)
   */
  private async analyzeVenueOverlapSignal(profileA: string, profileB: string): Promise<FriendshipSignal | null> {
    const timeWindow = new Date();
    timeWindow.setDate(timeWindow.getDate() - this.config.time_window_days);

    const { data: venueOverlap, error } = await supabase.rpc('analyze_venue_overlap_patterns', {
      profile_a_id: profileA,
      profile_b_id: profileB,
      time_window: timeWindow.toISOString()
    });

    if (error || !venueOverlap || venueOverlap.length === 0) {
      return null;
    }

            // Calculate Jaccard similarity for venue preferences
        const profileAVenues = new Set(venueOverlap.map((v: any) => v.venue_id).filter((id: string) => 
          venueOverlap.find((v: any) => v.venue_id === id)?.profile_a_visits > 0));
        const profileBVenues = new Set(venueOverlap.map((v: any) => v.venue_id).filter((id: string) => 
          venueOverlap.find((v: any) => v.venue_id === id)?.profile_b_visits > 0));
        
        const intersection = new Set([...profileAVenues].filter(v => profileBVenues.has(v)));
        const union = new Set([...profileAVenues, ...profileBVenues]);
        
        const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;
        
        // Weight by venue quality/popularity
        const weightedOverlap = venueOverlap.reduce((sum: number, venue: any) => {
          if (venue.profile_a_visits > 0 && venue.profile_b_visits > 0) {
            const venueWeight = Math.min(venue.profile_a_visits + venue.profile_b_visits, 10) / 10;
            return sum + venueWeight;
          }
          return sum;
        }, 0);

        const strength = (jaccardSimilarity * 0.6 + Math.min(weightedOverlap / 5, 1) * 0.4);
        const confidence = intersection.size >= 2 ? 0.7 : 0.4;

        return {
          signal_type: 'venue_overlap',
          strength,
          frequency: intersection.size,
          recency: 0.8, // Venue preferences are relatively stable
          confidence,
          metadata: {
            shared_venues: intersection.size,
            total_venues_a: profileAVenues.size,
            total_venues_b: profileBVenues.size,
            jaccard_similarity: jaccardSimilarity,
            weighted_overlap: weightedOverlap
          }
        };
  }

  /**
   * ⏰ Analyze time synchronization patterns
   */
  private async analyzeTimeSyncSignal(profileA: string, profileB: string): Promise<FriendshipSignal | null> {
    const { data: timeSyncData, error } = await supabase.rpc('analyze_time_sync_patterns', {
      profile_a_id: profileA,
      profile_b_id: profileB,
      time_window_days: this.config.time_window_days
    });

    if (error || !timeSyncData) {
      return null;
    }

    const syncScore = timeSyncData.sync_score || 0;
    const commonWindows = timeSyncData.common_windows || [];
    
    const strength = Math.min(syncScore, 1);
    const confidence = commonWindows.length >= 2 ? 0.6 : 0.3;

    return {
      signal_type: 'time_sync',
      strength,
      frequency: commonWindows.length,
      recency: 0.9, // Time patterns are recent by nature
      confidence,
      metadata: {
        sync_score: syncScore,
        common_activity_windows: commonWindows
      }
    };
  }

  /**
   * 📱 Analyze general interaction frequency
   */
  private async analyzeInteractionFrequencySignal(profileA: string, profileB: string): Promise<FriendshipSignal | null> {
    // This could analyze app usage patterns, mutual floq activity, etc.
    // For now, return a basic signal based on presence in same floqs
    const { data: mutualFloqs, error } = await supabase
      .from('floq_participants')
      .select('floq_id')
      .eq('user_id', profileA)
      .in('floq_id', 
        supabase.from('floq_participants')
          .select('floq_id')
          .eq('user_id', profileB)
      );

    if (error || !mutualFloqs || mutualFloqs.length === 0) {
      return null;
    }

    const mutualFloqCount = mutualFloqs.length;
    const strength = Math.min(mutualFloqCount / 3, 1); // Cap at 3 mutual floqs
    
    return {
      signal_type: 'interaction_frequency',
      strength,
      frequency: mutualFloqCount,
      recency: 0.7,
      confidence: 0.5, // Lower confidence for this indirect signal
      metadata: {
        mutual_floq_count: mutualFloqCount
      }
    };
  }

  /**
   * 🧮 Calculate weighted composite score
   */
  private calculateCompositeScore(signals: FriendshipSignal[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    signals.forEach(signal => {
      const weight = this.config.weights[signal.signal_type];
      const adjustedStrength = signal.strength * signal.confidence * signal.recency;
      
      weightedSum += adjustedStrength * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
  }

  /**
   * 🎯 Determine confidence level based on signal quality
   */
  private determineConfidenceLevel(signals: FriendshipSignal[], overallScore: number): 'low' | 'medium' | 'high' | 'very_high' {
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
    const strongSignals = signals.filter(s => s.strength > 0.6 && s.confidence > 0.7).length;

    if (strongSignals >= 3 && avgConfidence > 0.8 && overallScore > 75) return 'very_high';
    if (strongSignals >= 2 && avgConfidence > 0.7 && overallScore > 60) return 'high';
    if (strongSignals >= 1 && avgConfidence > 0.5 && overallScore > 40) return 'medium';
    return 'low';
  }

  /**
   * 👥 Determine relationship type based on score and signals
   */
  private determineRelationshipType(overallScore: number, signals: FriendshipSignal[]): 'acquaintance' | 'friend' | 'close_friend' | 'best_friend' {
    const coLocationStrength = signals.find(s => s.signal_type === 'co_location')?.strength || 0;
    const sharedActivityStrength = signals.find(s => s.signal_type === 'shared_activity')?.strength || 0;

    if (overallScore >= 80 && coLocationStrength > 0.8 && sharedActivityStrength > 0.7) return 'best_friend';
    if (overallScore >= 65 && (coLocationStrength > 0.6 || sharedActivityStrength > 0.6)) return 'close_friend';
    if (overallScore >= 45) return 'friend';
    return 'acquaintance';
  }

  /**
   * 🔍 Find friend suggestions for a profile
   */
  async findFriendSuggestions(profileId: string, limit: number = 10): Promise<FriendshipScore[]> {
    console.log(`[FriendDetection] Finding friend suggestions for profile: ${profileId}`);

    // Get potential candidates (profiles who have interacted with the profile somehow)
    const { data: candidates, error } = await supabase.rpc('get_friend_suggestion_candidates', {
      target_profile_id: profileId,
      limit: limit * 3 // Get more candidates to filter
    });

    if (error || !candidates) {
      console.error('[FriendDetection] Error getting candidates:', error);
      return [];
    }

    // Analyze each candidate
    const suggestions = await Promise.all(
      candidates.map((candidate: any) => 
        this.analyzeFriendshipPotential(profileId, candidate.profile_id)
      )
    );

    // Filter and sort by score
    return suggestions
      .filter(suggestion => 
        suggestion.overall_score >= 30 && // Minimum threshold
        suggestion.confidence_level !== 'low'
      )
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, limit);
  }
}