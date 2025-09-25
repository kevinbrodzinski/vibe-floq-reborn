import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRecommendationCapture } from '@/hooks/useRecommendationCapture';
import { edgeLog } from '@/lib/edgeLog';
import type { HalfResult } from './useHQMeetHalfway';

interface MeetHalfwaySuggestParams {
  floq_id: string;
  categories?: string[];
  max_km?: number;
  limit?: number;
  mode?: "walk" | "drive";
}

export function useMeetHalfwaySuggest() {
  const { flushNow } = useRecommendationCapture('balanced');

  return useMutation<HalfResult, Error, MeetHalfwaySuggestParams>({
    mutationFn: async (params) => {
      const { data, error } = await supabase.functions.invoke<HalfResult>(
        "hq-meet-halfway",
        { 
          body: params
        }
      );
      
      if (error) {
        edgeLog('pref_flush_after_meet_halfway', { 
          result: 'error', 
          message: error.message,
          floq_id: params.floq_id 
        });
        throw error;
      }

      // Flush preference signals after successful meet-halfway suggestion
      if (data?.candidates && data.candidates.length > 0) {
        await flushNow();
        edgeLog('pref_flush_after_meet_halfway', { 
          result: 'ok',
          candidateCount: data.candidates.length,
          floq_id: params.floq_id
        });
      } else {
        edgeLog('pref_flush_after_meet_halfway', { 
          result: 'noop',
          floq_id: params.floq_id
        });
      }

      return data!;
    },
    onError: (error, variables) => {
      console.error('Meet halfway suggestion failed:', error);
      edgeLog('pref_flush_after_meet_halfway', { 
        result: 'error', 
        message: (error as any)?.message,
        floq_id: variables.floq_id
      });
    }
  });
}