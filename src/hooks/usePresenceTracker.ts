import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Mount once (eg. in App.tsx) to keep *your* row in user_online_status alive.
 *  – Sends heartbeat every 30s while the tab is visible
 *  – Marks you offline on `beforeunload`
 */
export function usePresenceTracker(heartbeatMs = 30_000) {
  const { user } = useAuth();
  
  useEffect(() => {
    // Only run if we have a valid authenticated user
    if (!user?.id) {
      return;
    }
    
    let hb: NodeJS.Timeout | null = null;

    const upsert = async (online: boolean) => {
      // Double-check user exists before making the call
      if (!user?.id) {
        return;
      }
      
      try {
        const { error } = await supabase.rpc('upsert_online_status', { p_is_online: online });
        if (error) {
          // Handle function not found gracefully
          if (error.message?.includes('function') || error.code === '42883') {
            console.warn('upsert_online_status function not deployed, skipping online status updates');
            return;
          }
          throw error;
        }
      } catch (error: any) {
        // Graceful degradation for online status
        if (error.message?.includes('function') || error.code === '42883') {
          console.warn('Online status tracking disabled - function not available');
        } else {
          console.warn('Failed to update online status:', error);
        }
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
      if (user?.id) {
        upsert(false);
      }
    };
  }, [heartbeatMs, user?.id]);
}