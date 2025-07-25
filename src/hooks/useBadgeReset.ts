import { useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { resetBadge } from './usePushNotifications';

export function useBadgeReset() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Reset server-side counter when app becomes visible
        await resetBadge();
      }
    };

    const handleFocus = async () => {
      // Reset badge when window gains focus
      await resetBadge();
    };

    // Listen for visibility and focus changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Reset badge on initial load if app is already visible/focused
    if (document.visibilityState === 'visible') {
      resetBadge();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);
}