import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export function useBadgeReset() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Reset server-side counter when app becomes visible
        try {
          await supabase.rpc('reset_badge' as any);
        } catch (error) {
          console.error('Error resetting badge:', error);
        }
      }
    };

    const handleFocus = async () => {
      // Reset badge when window gains focus
      try {
        await supabase.rpc('reset_badge' as any);
      } catch (error) {
        console.error('Error resetting badge:', error);
      }
    };

    // Listen for visibility and focus changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Reset badge on initial load if app is already visible/focused
    if (document.visibilityState === 'visible') {
      (async () => {
        try {
          await supabase.rpc('reset_badge' as any);
        } catch (error) {
          console.error('Error resetting badge:', error);
        }
      })();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);
}