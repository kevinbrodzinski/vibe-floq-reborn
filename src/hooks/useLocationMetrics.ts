import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';
import type { Json } from '@/integrations/supabase/types';

interface LocationMetric {
  id: string;
  profile_id?: string;
  metric_name: string;
  metric_value: number;
  metadata: Json;
  recorded_at: string;
}

interface MetricsState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing location metrics
 */
export function useLocationMetrics() {
  const { user } = useAuth();
  const [state, setState] = useState<MetricsState>({
    isLoading: false,
    error: null
  });

  /**
   * Record a location metric
   */
  const recordMetric = useCallback(async (
    metricName: 'location_fix' | 'sharing_operation' | 'performance' | 'error' | 'cleanup_deleted_positions',
    value: number,
    metadata: Record<string, any> = {}
  ) => {
    // Don't set loading state for metrics to avoid constant UI flicker
    try {
      const { error } = await supabase
        .from('location_metrics')
        .insert({
          profile_id: user?.id || null,
          metric_name: metricName,
          metric_value: value,
          metadata
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error recording metric:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      throw error;
    }
  }, [user?.id]);

  /**
   * Get location metrics for the current user
   */
  const getMetrics = useCallback(async (
    metricName?: string,
    limit: number = 100
  ): Promise<LocationMetric[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let query = supabase
        .from('location_metrics')
        .select('*')
        .eq('profile_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (metricName) {
        query = query.eq('metric_name', metricName);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return data || [];
    } catch (error) {
      console.error('Error getting metrics:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
      throw error;
    }
  }, [user]);

  return {
    ...state,
    recordMetric,
    getMetrics
  };
}