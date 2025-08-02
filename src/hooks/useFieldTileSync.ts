import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Simplified field tile sync that connects vibes_now changes to field tile updates
 * This creates the real-time data flow: vibes_now → field_tiles → map display
 */
export const useFieldTileSync = () => {
  const queryClient = useQueryClient();
  const lastRunRef = useRef(0);
  const debouncedRefresh = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerRefresh = async () => {
    const now = Date.now();

    if (document.visibilityState !== 'visible') return;
    if (now - lastRunRef.current < 10_000) return;

    try {
      const { error } = await supabase.functions.invoke('refresh_field_tiles');
      if (error) throw error;
      lastRunRef.current = now;
      queryClient.invalidateQueries({ queryKey: ['field-tiles'] });
    } catch (e) {
      console.error('[FieldTileSync] refresh failed:', e);
      lastRunRef.current = 0;          // allow immediate retry
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('field_tiles_sync')
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'vibes_now' },
          () => {
            if (debouncedRefresh.current) clearTimeout(debouncedRefresh.current);
            debouncedRefresh.current = setTimeout(triggerRefresh, 2_000);
          })
      .subscribe();

    // first refresh a few seconds after mount
    const first = setTimeout(triggerRefresh, 2_000);

    const onVis = () => document.visibilityState === 'visible' && triggerRefresh();
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearTimeout(first);
      if (debouncedRefresh.current) clearTimeout(debouncedRefresh.current);
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return { triggerRefresh };
};