
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTrackPlanShareClick(slug?: string) {
  useEffect(() => {
    if (!slug) return;

    // Click tracking is now handled automatically by the resolve-plan-slug edge function
    // No additional tracking needed here
  }, [slug]);
}
