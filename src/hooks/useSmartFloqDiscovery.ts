import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Enhanced interface for SmartFloqMatch
export interface SmartFloqMatch {
  id: string;
  title: string;
  matchScore: number;
  floq: {
    id: string;
    title: string;
    primary_vibe?: string;
    participant_count?: number;
    distance_meters?: number;
    starts_at?: string;
  };
  vibeMatchScore: number;
  confidenceScore: number;
  matchReasons: string[];
  contextFactors: {
    vibe: number;
    temporal: number;
    proximity: number;
    social: number;
  };
  coords: { lat: number; lng: number; accuracy: number };
  vibe_tag?: string;
  ends_at?: string;
  distance_m?: number;
  friends_going_count?: number;
}

export const useSmartFloqDiscovery = () => {
  const { user } = useAuth();
  const [smartMatches, setSmartMatches] = useState<SmartFloqMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discover = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Try to use the generate-intelligence edge function for smart discovery
      const { data, error: functionError } = await supabase.functions.invoke('generate-floq-auto-match', {
        body: { 
          profile_id: user.id,
          mode: 'floq-match'
        }
      });

      if (functionError) {
        console.warn('Smart discovery function not available, using fallback');
        // Fallback to basic floq discovery
        const { data: floqsData, error: floqsError } = await supabase
          .from('floqs')
          .select(`
            id,
            title,
            primary_vibe,
            starts_at,
            ends_at,
            coords,
            participant_count:floq_participants(count)
          `)
          .eq('status', 'active')
          .limit(10);

        if (floqsError) throw floqsError;

        const matches: SmartFloqMatch[] = (floqsData || []).map(floq => ({
          id: floq.id,
          title: floq.title,
          matchScore: 0.5, // Default match score
          floq: {
            id: floq.id,
            title: floq.title,
            primary_vibe: floq.primary_vibe,
            participant_count: Array.isArray(floq.participant_count) ? floq.participant_count.length : 0,
            starts_at: floq.starts_at,
          },
          vibeMatchScore: 0.5,
          confidenceScore: 0.3,
          matchReasons: ['Active floq in your area'],
          contextFactors: {
            vibe: 0.5,
            temporal: 0.5,
            proximity: 0.5,
            social: 0.5,
          },
          coords: floq.coords || { lat: 0, lng: 0, accuracy: 0 },
          vibe_tag: floq.primary_vibe,
          ends_at: floq.ends_at,
          distance_m: 0,
          friends_going_count: 0,
        }));

        setSmartMatches(matches);
      } else {
        // Use AI-generated matches if available
        setSmartMatches(data?.matches || []);
      }
    } catch (err) {
      console.error('Discovery error:', err);
      setError('Failed to discover floqs');
      setSmartMatches([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Auto-discover on mount if user is available
  useEffect(() => {
    if (user?.id) {
      discover();
    }
  }, [user?.id, discover]);

  return {
    smartMatches,
    loading,
    error,
    discover
  };
};