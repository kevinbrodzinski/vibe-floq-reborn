import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FriendDetectionEngine } from '@/lib/friendDetection/FriendDetectionEngine';
import type { 
  FriendshipScore, 
  FriendSuggestion, 
  FriendDetectionConfig,
  FriendSuggestionRecord
} from '@/types/friendDetection';

// =====================================================
// 🎯 Main Friend Detection Hook
// =====================================================
export function useFriendDetection(config?: Partial<FriendDetectionConfig>) {
  const [engine] = useState(() => new FriendDetectionEngine(config));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Analyze friendship potential between two users
   */
     const analyzeFriendship = useCallback(async (profileA: string, profileB: string): Promise<FriendshipScore | null> => {
     setIsAnalyzing(true);
     setError(null);

     try {
       const score = await engine.analyzeFriendshipPotential(profileA, profileB);
       
       // Store analysis in database
       await supabase.rpc('upsert_friendship_analysis', {
         p_profile_a: profileA,
         p_profile_b: profileB,
         p_overall_score: score.overall_score,
         p_confidence_level: score.confidence_level,
         p_signals_data: score.signals,
         p_relationship_type: score.relationship_type
       });

       return score;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('[useFriendDetection] Analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [engine]);

     /**
    * Get friend suggestions for a profile
    */
   const getFriendSuggestions = useCallback(async (profileId: string, limit: number = 10): Promise<FriendshipScore[]> => {
     setIsAnalyzing(true);
     setError(null);

     try {
       const suggestions = await engine.findFriendSuggestions(profileId, limit);
       
       // Store suggestions in database for tracking
       await Promise.all(
         suggestions.map(suggestion => 
           supabase.rpc('create_friend_suggestion', {
             p_target_profile_id: profileId,
             p_suggested_friend_id: suggestion.profile_high === profileId ? suggestion.profile_low : suggestion.profile_high,
             p_score: suggestion.overall_score,
             p_confidence_level: suggestion.confidence_level,
             p_suggestion_reason: generateSuggestionReason(suggestion),
             p_signals_summary: generateSignalsSummary(suggestion.signals)
           })
         )
       );

      return suggestions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('[useFriendDetection] Suggestions error:', err);
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, [engine]);

  return {
    analyzeFriendship,
    getFriendSuggestions,
    isAnalyzing,
    error,
    engine
  };
}

// =====================================================
// 🎯 Friend Suggestions Hook
// =====================================================
export function useFriendSuggestions(profileId: string | null, options?: {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { limit = 10, autoRefresh = false, refreshInterval = 5 * 60 * 1000 } = options || {};
  
  const [suggestions, setSuggestions] = useState<FriendSuggestionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const { getFriendSuggestions } = useFriendDetection();

  /**
   * Fetch suggestions from database
   */
  const fetchSuggestions = useCallback(async () => {
    if (!profileId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('friend_suggestions')
        .select(`
          *,
          suggested_friend:profiles!friend_suggestions_suggested_friend_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('target_profile_id', profileId)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .order('score', { ascending: false })
        .limit(limit);

      if (dbError) throw dbError;

      setSuggestions(data || []);
      setLastFetch(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch suggestions';
      setError(errorMessage);
      console.error('[useFriendSuggestions] Fetch error:', err);
    } finally {
      setLoading(false);
    }
      }, [profileId, limit]);

  /**
   * Generate new suggestions
   */
     const generateSuggestions = useCallback(async () => {
     if (!profileId) return;

     setLoading(true);
     setError(null);

     try {
       await getFriendSuggestions(profileId, limit);
       await fetchSuggestions(); // Refresh the list
     } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'Failed to generate suggestions';
       setError(errorMessage);
       console.error('[useFriendSuggestions] Generate error:', err);
     } finally {
       setLoading(false);
     }
   }, [profileId, limit, getFriendSuggestions, fetchSuggestions]);

  /**
   * Respond to a friend suggestion
   */
  const respondToSuggestion = useCallback(async (
    suggestionId: string, 
    response: 'accepted' | 'declined' | 'ignored'
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('friend_suggestions')
        .update({
          status: response,
          responded_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      if (updateError) throw updateError;

      // If accepted, create actual friendship
      if (response === 'accepted') {
        const suggestion = suggestions.find(s => s.id === suggestionId);
        if (suggestion) {
                   const { error: friendError } = await supabase
           .from('friends')
           .insert({
             user_a: profileId,
             user_b: suggestion.suggested_friend_id,
             status: 'accepted'
           });

          if (friendError) {
            console.error('[useFriendSuggestions] Friend creation error:', friendError);
          }
        }
      }

      // Remove from local state
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
         } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'Failed to respond to suggestion';
       setError(errorMessage);
       console.error('[useFriendSuggestions] Response error:', err);
     }
   }, [suggestions, profileId]);

     // Initial fetch
   useEffect(() => {
     if (profileId) {
       fetchSuggestions();
     }
   }, [profileId, fetchSuggestions]);

   // Auto-refresh
   useEffect(() => {
     if (!autoRefresh || !profileId) return;

     const interval = setInterval(() => {
       fetchSuggestions();
     }, refreshInterval);

     return () => clearInterval(interval);
   }, [autoRefresh, profileId, refreshInterval, fetchSuggestions]);

  // Cleanup expired suggestions
  useEffect(() => {
    const cleanupExpired = () => {
      setSuggestions(prev => 
        prev.filter(s => new Date(s.expires_at) > new Date())
      );
    };

    const interval = setInterval(cleanupExpired, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return {
    suggestions,
    loading,
    error,
    lastFetch,
    fetchSuggestions,
    generateSuggestions,
    respondToSuggestion,
    refetch: fetchSuggestions
  };
}

// =====================================================
// 🎯 Friendship Analysis Hook
// =====================================================
export function useFriendshipAnalysis(profileA: string | null, profileB: string | null) {
  const [analysis, setAnalysis] = useState<FriendshipScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { analyzeFriendship } = useFriendDetection();

  const performAnalysis = useCallback(async () => {
    if (!profileA || !profileB || profileA === profileB) return;

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeFriendship(profileA, profileB);
      setAnalysis(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [profileA, profileB, analyzeFriendship]);

  // Auto-analyze when profiles change
  useEffect(() => {
    if (profileA && profileB) {
      performAnalysis();
    } else {
      setAnalysis(null);
    }
  }, [profileA, profileB, performAnalysis]);

  return {
    analysis,
    loading,
    error,
    performAnalysis,
    refetch: performAnalysis
  };
}

// =====================================================
// 🔧 Helper Functions
// =====================================================

/**
 * Generate human-readable suggestion reason
 */
function generateSuggestionReason(score: FriendshipScore): string {
  const signals = score.signals;
  const reasons: string[] = [];

  const coLocationSignal = signals.find(s => s.signal_type === 'co_location');
  if (coLocationSignal && coLocationSignal.strength > 0.5) {
    const venues = coLocationSignal.metadata?.venues?.length || 0;
    reasons.push(`You've been at the same ${venues > 1 ? 'places' : 'place'} ${coLocationSignal.frequency} times`);
  }

  const sharedActivitySignal = signals.find(s => s.signal_type === 'shared_activity');
  if (sharedActivitySignal && sharedActivitySignal.strength > 0.4) {
    const floqs = sharedActivitySignal.metadata?.shared_floqs || 0;
    const plans = sharedActivitySignal.metadata?.shared_plans || 0;
    if (floqs > 0 && plans > 0) {
      reasons.push(`You've joined ${floqs} floqs and ${plans} plans together`);
    } else if (floqs > 0) {
      reasons.push(`You've been in ${floqs} floqs together`);
    } else if (plans > 0) {
      reasons.push(`You've attended ${plans} plans together`);
    }
  }

  const venueOverlapSignal = signals.find(s => s.signal_type === 'venue_overlap');
  if (venueOverlapSignal && venueOverlapSignal.strength > 0.3) {
    const sharedVenues = venueOverlapSignal.metadata?.shared_venues || 0;
    reasons.push(`You both visit ${sharedVenues} of the same places`);
  }

  const timeSyncSignal = signals.find(s => s.signal_type === 'time_sync');
  if (timeSyncSignal && timeSyncSignal.strength > 0.4) {
    reasons.push(`You're often active at similar times`);
  }

  if (reasons.length === 0) {
    reasons.push(`You have ${score.overall_score}/100 compatibility based on your activity patterns`);
  }

  return reasons.join(' • ');
}

/**
 * Generate signals summary for storage
 */
function generateSignalsSummary(signals: any[]): Record<string, number> {
  const summary: Record<string, number> = {};
  
  signals.forEach(signal => {
    summary[signal.signal_type] = Math.round(signal.strength * 100);
  });

  return summary;
}

// =====================================================
// 🎯 Batch Friend Analysis Hook
// =====================================================
export function useBatchFriendAnalysis() {
  const [results, setResults] = useState<Map<string, FriendshipScore>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { analyzeFriendship } = useFriendDetection();

  /**
   * Analyze multiple user pairs in batch
   */
     const analyzeBatch = useCallback(async (profilePairs: Array<[string, string]>) => {
     setLoading(true);
     setError(null);
     
     try {
       const analyses = await Promise.allSettled(
         profilePairs.map(([profileA, profileB]) => 
           analyzeFriendship(profileA, profileB).then(result => ({
             key: `${profileA}-${profileB}`,
             result
           }))
         )
       );

       const newResults = new Map<string, FriendshipScore>();
       
       analyses.forEach((analysis, index) => {
         if (analysis.status === 'fulfilled' && analysis.value.result) {
           newResults.set(analysis.value.key, analysis.value.result);
         } else if (analysis.status === 'rejected') {
           console.error(`[useBatchFriendAnalysis] Failed to analyze pair ${profilePairs[index]}:`, analysis.reason);
         }
       });

       setResults(newResults);
     } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'Batch analysis failed';
       setError(errorMessage);
       console.error('[useBatchFriendAnalysis] Batch error:', err);
     } finally {
       setLoading(false);
     }
   }, [analyzeFriendship]);

     /**
    * Get analysis result for a specific pair
    */
   const getResult = useCallback((profileA: string, profileB: string): FriendshipScore | null => {
     return results.get(`${profileA}-${profileB}`) || results.get(`${profileB}-${profileA}`) || null;
   }, [results]);

  return {
    results,
    loading,
    error,
    analyzeBatch,
    getResult,
    clear: () => setResults(new Map())
  };
}