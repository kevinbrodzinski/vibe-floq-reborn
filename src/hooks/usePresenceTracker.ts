import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Mount once (eg. in App.tsx) to keep *your* row in user_online_status alive.
 *  – Sends heartbeat every 30s while the tab is visible
 *  – Marks you offline on `beforeunload`
 */
export function usePresenceTracker(heartbeatMs = 30_000) {
  useEffect(() => {
    let hb: NodeJS.Timeout | null = null;

    const upsert = async (online: boolean) => {
      try {
        await supabase.rpc('upsert_online_status', { p_is_online: online });
      } catch (error) {
        console.warn('Failed to update online status:', error);
      }
    };

    // Initial login
    upsert(true);

    const startHeartbeat = () => {
      hb = window.setInterval(() => upsert(true), heartbeatMs) as any;
    };
    
    const stopHeartbeat = () => {
      if (hb) clearInterval(hb);
      hb = null;
    };

    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        upsert(true);
        startHeartbeat();
      } else {
        upsert(false);
        stopHeartbeat();
      }
    };

    const handleBeforeUnload = () => {
      upsert(false);
    };

    startHeartbeat();
    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      upsert(false);
    };
  }, [heartbeatMs]);
}