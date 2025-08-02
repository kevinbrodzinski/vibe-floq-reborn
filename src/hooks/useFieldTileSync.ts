import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Simplified field tile sync that connects vibes_now changes to field tile updates
 * This creates the real-time data flow: vibes_now → field_tiles → map display
 */
export const useFieldTileSync = () => {
  const queryClient = useQueryClient();
  const lastRunRef = useRef<number>(0);
  const debouncedRefresh = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerRefresh = async () => {
    // Minimum-interval guard: 10 seconds between refreshes
    const now = Date.now();
    if (now - lastRunRef.current < 10000) return;
    
    // Only refresh visible tabs to reduce server load
    if (document.visibilityState !== 'visible') return;
    
    
    lastRunRef.current = now;
    
    try {
      console.log('[FieldTileSync] Refreshing field tiles...');
      
      const { data, error } = await supabase.functions.invoke('refresh_field_tiles');
      
      if (error) {
        console.error('[FieldTileSync] Refresh error:', error);
        return;
      }
      
      console.log('[FieldTileSync] Refresh success:', data);
      
      // Invalidate cache to show fresh data
      
      // Invalidate cache to show fresh data
      queryClient.invalidateQueries({ queryKey: ['field-tiles'] });
      
    } catch (error) {
      console.error('[FieldTileSync] Exception:', error);
    }
  };

  useEffect(() => {
    // Listen for vibes_now changes
    const channel = supabase
      .channel('field_tiles_sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'vibes_now'
      }, () => {
        // Debounced refresh with single timeout instance
        if (debouncedRefresh.current) clearTimeout(debouncedRefresh.current);
        debouncedRefresh.current = setTimeout(triggerRefresh, 2000);
      })
      .subscribe();

    // Initial refresh after 2 seconds
    setTimeout(triggerRefresh, 2000);

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { triggerRefresh };
};