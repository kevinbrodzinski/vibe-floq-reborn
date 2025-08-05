
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProximityAnalysis } from '@/types/location';

export function useEnhancedLocationSharing() {
  const [proximityData, setProximityData] = useState<ProximityAnalysis[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  const analyzeProximity = useCallback((data: ProximityAnalysis[]) => {
    return data.map(analysis => ({
      ...analysis,
      // Handle both profile_id and legacy userId fields
      profileId: analysis.profile_id || analysis.userId || '',
      userId: analysis.userId || analysis.profile_id || '',
    }));
  }, []);

  const updateProximityData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('proximity_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const analyzedData = analyzeProximity(data || []);
      setProximityData(analyzedData);
    } catch (error) {
      console.error('Error updating proximity data:', error);
    }
  }, [analyzeProximity]);

  useEffect(() => {
    updateProximityData();
  }, [updateProximityData]);

  return {
    proximityData,
    isSharing,
    setIsSharing,
    updateProximityData,
  };
}
