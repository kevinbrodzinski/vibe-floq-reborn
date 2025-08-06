import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FriendDetectionEngine } from '@/lib/friendDetection/FriendDetectionEngine';
import type {
  FriendDetectionConfig,
  FriendshipAnalysis,
  FriendSuggestion,
  FriendSuggestionRecord
} from '@/types/friendDetection';

/**
 * React hooks for friend detection system
 * 
 * Note: These hooks use profileId which equals auth.users.id (1:1 FK relationship).
 * The friendships table uses auth.users.id directly as user_low/user_high.
 */

// Hook for the core friend detection engine
export function useFriendDetection(config?: Partial<FriendDetectionConfig>) {
  const [engine] = useState(() => new FriendDetectionEngine(config));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeFriendship = useCallback(async (profileA: string, profileB: string): Promise<FriendshipAnalysis | null> => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const analysis = await engine.analyzeFriendshipPotential(profileA, profileB);
      
      // Store the analysis in the database
      const { error: rpcError } = await supabase.rpc('upsert_friendship_analysis', {
        p_profile_a: profileA,
        p_profile_b: profileB,
        p_overall_score: analysis.overall_score,
        p_confidence_level: analysis.confidence_level,
        p_signals_data: analysis.signals_data,
        p_relationship_type: analysis.relationship_type
      });

      if (rpcError) {
        console.error('Error storing friendship analysis:', rpcError);
        // Don't throw here - return the analysis even if storage fails
      }

      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during friendship analysis';
      setError(errorMessage);
      console.error('Friendship analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [engine]);

  const getFriendSuggestions = useCallback(async (profileId: string, limit: number = 10): Promise<FriendSuggestion[]> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const suggestions = await engine.findFriendSuggestions(profileId, limit);
      
      // Store suggestions in the database
      for (const suggestion of suggestions) {
        try {
          await supabase.rpc('create_friend_suggestion', {
            p_target_profile_id: suggestion.target_profile_id,
            p_suggested_profile_id: suggestion.suggested_profile_id,
            p_score: suggestion.score,
            p_confidence_level: suggestion.confidence_level,
            p_suggestion_reason: suggestion.suggestion_reason,
            p_signals_summary: suggestion.signals_summary
          });
        } catch (suggestionError) {
          console.error('Error storing friend suggestion:', suggestionError);
          // Continue with other suggestions even if one fails
        }
      }

      return suggestions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error getting friend suggestions';
      setError(errorMessage);
      console.error('Friend suggestions error:', err);
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, [engine]);

  return {
    analyzeFriendship,
    getFriendSuggestions,
    isAnalyzing,
    error
  };
}

// Hook for managing friend suggestions for a specific user
export function useFriendSuggestions(profileId: string, options?: { limit?: number; autoRefresh?: boolean }) {
  const [suggestions, setSuggestions] = useState<FriendSuggestionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!profileId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('friend_suggestions')
        .select(`
          id,
          target_profile_id,
          suggested_profile_id,
          score,
          confidence_level,
          suggestion_reason,
          signals_summary,
          status,
          created_at,
          responded_at,
          expires_at,
          profiles!friend_suggestions_suggested_profile_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('target_profile_id', profileId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('score', { ascending: false })
        .limit(options?.limit || 10);

      if (fetchError) throw fetchError;

      setSuggestions(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch friend suggestions';
      setError(errorMessage);
      console.error('Error fetching friend suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [profileId, options?.limit]);

  const respondToSuggestion = useCallback(async (suggestionId: string, response: 'accepted' | 'declined'): Promise<boolean> => {
    try {
      // Update the suggestion status
      const { error: updateError } = await supabase
        .from('friend_suggestions')
        .update({
          status: response,
          responded_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      if (updateError) throw updateError;

      // If accepted, create the friendship
      if (response === 'accepted') {
        const suggestion = suggestions.find(s => s.id === suggestionId);
        if (suggestion) {
          // Ensure canonical ordering for friendships table
          const userLow = profileId < suggestion.suggested_profile_id ? profileId : suggestion.suggested_profile_id;
          const userHigh = profileId < suggestion.suggested_profile_id ? suggestion.suggested_profile_id : profileId;

          const { error: friendshipError } = await supabase
            .from('friendships')
            .insert({
              user_low: userLow,
              user_high: userHigh,
              friend_state: 'accepted',
              responded_at: new Date().toISOString()
            });

          if (friendshipError) throw friendshipError;
        }
      }

      // Refresh suggestions
      await fetchSuggestions();
      return true;
    } catch (err) {
      console.error(`Error responding to suggestion:`, err);
      setError(err instanceof Error ? err.message : 'Failed to respond to suggestion');
      return false;
    }
  }, [suggestions, profileId, fetchSuggestions]);

  const generateNewSuggestions = useCallback(async (): Promise<boolean> => {
    const { getFriendSuggestions } = useFriendDetection();
    
    try {
      await getFriendSuggestions(profileId, options?.limit || 10);
      await fetchSuggestions();
      return true;
    } catch (err) {
      console.error('Error generating new suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
      return false;
    }
  }, [profileId, options?.limit, fetchSuggestions]);

  // Auto-fetch on mount and when profileId changes
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!options?.autoRefresh) return;

    const interval = setInterval(fetchSuggestions, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchSuggestions, options?.autoRefresh]);

  return {
    suggestions,
    isLoading,
    error,
    refetch: fetchSuggestions,
    respondToSuggestion,
    generateNewSuggestions
  };
}

// Hook for analyzing a specific friendship pair
export function useFriendshipAnalysis(profileA: string, profileB: string) {
  const [analysis, setAnalysis] = useState<FriendshipAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { analyzeFriendship } = useFriendDetection();

  const analyzeRelationship = useCallback(async () => {
    if (!profileA || !profileB || profileA === profileB) return;

    setIsLoading(true);
    setError(null);

    try {
      // First check if we have a recent analysis
      const userLow = profileA < profileB ? profileA : profileB;
      const userHigh = profileA < profileB ? profileB : profileA;

      const { data: existingAnalysis } = await supabase
        .from('friendship_analysis')
        .select('*')
        .eq('user_low', userLow)
        .eq('user_high', userHigh)
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within 24 hours
        .single();

      if (existingAnalysis) {
        setAnalysis({
          user_low: existingAnalysis.user_low,
          user_high: existingAnalysis.user_high,
          overall_score: existingAnalysis.overall_score,
          confidence_level: existingAnalysis.confidence_level,
          relationship_type: existingAnalysis.relationship_type,
          signals_data: existingAnalysis.signals_data,
          created_at: new Date(existingAnalysis.created_at),
          updated_at: new Date(existingAnalysis.updated_at)
        });
        return;
      }

      // Perform new analysis
      const newAnalysis = await analyzeFriendship(profileA, profileB);
      setAnalysis(newAnalysis);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze friendship';
      setError(errorMessage);
      console.error('Friendship analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [profileA, profileB, analyzeFriendship]);

  // Auto-analyze when profiles change
  useEffect(() => {
    analyzeRelationship();
  }, [analyzeRelationship]);

  return {
    analysis,
    isLoading,
    error,
    reanalyze: analyzeRelationship
  };
}

// Hook for batch friendship analysis
export function useBatchFriendAnalysis() {
  const [results, setResults] = useState<Map<string, FriendshipAnalysis>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const { analyzeFriendship } = useFriendDetection();

  const analyzeBatch = useCallback(async (profilePairs: Array<[string, string]>): Promise<void> => {
    setIsAnalyzing(true);
    setError(null);
    setProgress({ completed: 0, total: profilePairs.length });
    setResults(new Map());

    try {
      for (let i = 0; i < profilePairs.length; i++) {
        const [profileA, profileB] = profilePairs[i];
        
        try {
          const analysis = await analyzeFriendship(profileA, profileB);
          if (analysis) {
            const key = `${profileA}-${profileB}`;
            setResults(prev => new Map(prev.set(key, analysis)));
          }
        } catch (pairError) {
          console.error(`Error analyzing pair ${profileA}-${profileB}:`, pairError);
          // Continue with other pairs
        }

        setProgress({ completed: i + 1, total: profilePairs.length });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch analysis failed';
      setError(errorMessage);
      console.error('Batch analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeFriendship]);

  const getResult = useCallback((profileA: string, profileB: string): FriendshipAnalysis | null => {
    const key1 = `${profileA}-${profileB}`;
    const key2 = `${profileB}-${profileA}`;
    return results.get(key1) || results.get(key2) || null;
  }, [results]);

  const clearResults = useCallback(() => {
    setResults(new Map());
    setProgress({ completed: 0, total: 0 });
    setError(null);
  }, []);

  return {
    analyzeBatch,
    getResult,
    clearResults,
    results: Array.from(results.values()),
    isAnalyzing,
    progress,
    error
  };
}