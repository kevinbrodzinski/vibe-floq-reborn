import { supabase } from '@/integrations/supabase/client';

/**
 * Developer utility to manually refresh trade winds data.
 * Calls the refresh_trade_winds_all RPC function to materialize
 * flow samples into trade_winds paths.
 */
export async function devRefreshWindsNow(): Promise<void> {
  if (!import.meta.env.DEV) {
    console.warn('[devRefreshWinds] Only available in development mode');
    return;
  }

  try {
    console.info('[devRefreshWinds] Starting refresh_trade_winds_all...');
    const { data, error } = await supabase.rpc('refresh_trade_winds_all');
    
    if (error) {
      console.error('[devRefreshWinds] Failed:', error);
      return;
    }
    
    const pathsCreated = data || 0;
    console.info(`[devRefreshWinds] Success! Created ${pathsCreated} wind paths`);
    
  } catch (e) {
    console.error('[devRefreshWinds] Exception:', e);
  }
}

// Expose globally for console access in dev
if (import.meta.env.DEV) {
  (window as any).devRefreshWindsNow = devRefreshWindsNow;
}