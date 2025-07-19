import useSWRMutation from 'swr/mutation';
import { supabase } from '@/integrations/supabase/client';

interface PlanShareLinkResponse {
  slug: string;
  url: string;
}

export function usePlanShareLink(planId: string) {
  return useSWRMutation(
    ['plan-share-link', planId],
    async () => {
      console.log('Creating plan share link for:', planId);
      
      const { data, error } = await supabase.functions.invoke('create-plan-share-link', {
        body: { plan_id: planId }
      });
      
      if (error) {
        console.error('Error creating plan share link:', error);
        throw error;
      }
      
      if (!data || typeof data !== 'object' || !data.url || !data.slug) {
        console.error('Invalid response from create-plan-share-link:', data);
        throw new Error('Invalid response format from server');
      }
      
      console.log('Plan share link created:', data);
      return data as PlanShareLinkResponse;
    },
    { revalidate: false }
  );
}