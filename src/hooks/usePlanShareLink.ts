import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlanShareLinkResponse {
  slug: string;
  url: string;
}

async function callCreatePlanShareLink(planId: string): Promise<PlanShareLinkResponse> {
  console.log('Creating plan share link for:', planId);
  
  // First check if a share link already exists
  const { data: existing, error: queryError } = await supabase
    .from('plan_share_links')
    .select('slug')
    .eq('plan_id', planId)
    .maybeSingle();
  
  if (queryError) {
    console.error('Error querying existing share link:', queryError);
    throw queryError;
  }
  
  if (existing?.slug) {
    console.log('Found existing share link:', existing.slug);
    return {
      slug: existing.slug,
      url: `${window.location.origin}/plan/${existing.slug}`
    };
  }
  
  // Create new share link via edge function
  const { data, error } = await supabase.functions.invoke('create-plan-share-link', {
    body: { plan_id: planId }
  });
  
  if (error) {
    console.error('Error creating plan share link:', { message: error.message, name: error.name });
    throw error;
  }
  
  if (!data || typeof data !== 'object' || !data.url || !data.slug) {
    console.error('Invalid response from create-plan-share-link:', { data });
    throw new Error('Invalid response format from server');
  }
  
  console.log('Plan share link created:', data);
  return data as PlanShareLinkResponse;
}

export function usePlanShareLink(planId?: string) {
  return useMutation({
    mutationFn: () => callCreatePlanShareLink(planId!),
  });
}