
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTrackPlanShareClick(slug?: string) {
  useEffect(() => {
    if (!slug) return;

    const trackClick = async () => {
      try {
        const { error } = await supabase
          .from('plan_share_links')
          .update({
            click_count: supabase.raw('COALESCE(click_count, 0) + 1'),
            last_accessed_at: new Date().toISOString(),
          })
          .eq('slug', slug);

        if (error) {
          console.warn('[ShareTrack] Failed to update click:', error);
        }
      } catch (err) {
        console.warn('[ShareTrack] Error tracking click:', err);
      }
    };

    trackClick();
  }, [slug]);
}
