import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Enhanced interface for plan optimization
export interface PlanOptimizationSuggestion {
  id: string;
  type: 'reorder' | 'add_stop' | 'remove_stop' | 'timing_adjustment';
  confidence: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  estimatedTimeSaving?: number; // in minutes
  estimatedCostSaving?: number; // in dollars
}

interface PlanOptimization {
  totalTimeSaving: number;
  totalCostSaving: number;
  suggestions: PlanOptimizationSuggestion[];
  optimizationScore: number; // 0-100
}

export const useSmartPlanOptimization = () => {
  const { user } = useAuth();
  const [optimization, setOptimization] = useState<PlanOptimization | null>(null);
  const [suggestions, setSuggestions] = useState<PlanOptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimizeStops = useCallback(async (planId: string) => {
    if (!user?.id || !planId) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      // Try to use AI-powered optimization
      const { data, error: functionError } = await supabase.functions.invoke('generate-plan-summary', {
        body: { 
          plan_id: planId,
          mode: 'optimization',
          profile_id: user.id
        }
      });

      if (functionError) {
        console.warn('AI optimization not available, using rule-based fallback');
        
        // Fallback to rule-based optimization
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select(`
            id,
            title,
            plan_stops (
              id,
              venue_id,
              order_index,
              estimated_duration_minutes,
              venues (name, coords)
            )
          `)
          .eq('id', planId)
          .single();

        if (planError) throw planError;

        const stops = planData?.plan_stops || [];
        const basicSuggestions: PlanOptimizationSuggestion[] = [];

        // Rule 1: Too many stops
        if (stops.length > 4) {
          basicSuggestions.push({
            id: 'reduce-stops',
            type: 'remove_stop',
            confidence: 0.8,
            reasoning: 'Plans with more than 4 stops often feel rushed',
            priority: 'high',
            title: 'Consider reducing stops',
            description: 'Remove 1-2 less essential stops for a more relaxed experience',
            impact: 'More time to enjoy each location',
            estimatedTimeSaving: 30,
          });
        }

        // Rule 2: Long durations
        const totalDuration = stops.reduce((sum, stop) => sum + (stop.estimated_duration_minutes || 60), 0);
        if (totalDuration > 300) { // 5+ hours
          basicSuggestions.push({
            id: 'reduce-duration',
            type: 'timing_adjustment',
            confidence: 0.7,
            reasoning: 'Long plans can lead to fatigue',
            priority: 'medium',
            title: 'Consider shorter durations',
            description: 'Reduce time at each stop by 15-30 minutes',
            impact: 'Less fatigue, more enjoyable experience',
            estimatedTimeSaving: 60,
          });
        }

        setSuggestions(basicSuggestions);
        
        const optimizationResult: PlanOptimization = {
          totalTimeSaving: basicSuggestions.reduce((sum, s) => sum + (s.estimatedTimeSaving || 0), 0),
          totalCostSaving: 0,
          suggestions: basicSuggestions,
          optimizationScore: basicSuggestions.length > 0 ? 75 : 90,
        };
        
        setOptimization(optimizationResult);
        return basicSuggestions;
      } else {
        // Use AI-generated optimization
        const aiSuggestions = data?.suggestions || [];
        setSuggestions(aiSuggestions);
        setOptimization(data?.optimization || null);
        return aiSuggestions;
      }
    } catch (err) {
      console.error('Optimization error:', err);
      setError('Optimization failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const suggestReorders = useCallback(async (planId: string) => {
    // Simple geographic optimization
    const suggestions = await optimizeStops(planId);
    return suggestions.filter(s => s.type === 'reorder');
  }, [optimizeStops]);

  const analyzeStopVibes = useCallback(async (planId: string) => {
    if (!user?.id || !planId) return {};
    
    try {
      const { data, error } = await supabase
        .from('plans')
        .select(`
          plan_stops (
            venue_id,
            venues (primary_vibe, energy_level)
          )
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;

      const vibeAnalysis = (data?.plan_stops || []).reduce((acc, stop) => {
        const venue = stop.venues;
        if (venue) {
          acc[stop.venue_id] = {
            vibe: venue.primary_vibe,
            energy: venue.energy_level,
            compatibility: 0.8 // Default compatibility score
          };
        }
        return acc;
      }, {} as Record<string, any>);

      return vibeAnalysis;
    } catch (err) {
      console.error('Vibe analysis error:', err);
      return {};
    }
  }, [user?.id]);

  const getOptimalTiming = useCallback(async (planId: string) => {
    // Return basic timing optimization
    return {
      suggestedStartTime: '18:00',
      estimatedEndTime: '22:00',
      peakTimes: ['19:00-20:00'],
      reasoning: 'Based on typical venue peak hours'
    };
  }, []);

  return {
    optimization,
    suggestions,
    loading,
    error,
    optimizeStops,
    suggestReorders,
    analyzeStopVibes,
    getOptimalTiming
  };
};